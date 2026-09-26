/// <reference types="node" />
/**
 * @jest-environment node
 *
 * Migrations, catalogue sync and the exercise repository against real
 * SQLite (Node's built-in). Native persistence on iOS is checked separately
 * on the Simulator.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  CATALOGUE_SYNCED_AT_KEY,
  syncCatalogue,
  validateCatalogue,
  type Catalogue,
} from '../src/db/catalogue';
import { getMeta } from '../src/db/meta';
import {
  getSchemaVersion,
  LATEST_SCHEMA_VERSION,
  migrate,
  type Migration,
} from '../src/db/migrations';
import {
  CATALOGUE_VERSION,
  exerciseCatalogue,
} from '../src/data/exerciseCatalogue';
import { mediaCatalogue } from '../src/data/mediaCatalogue';
import { createExerciseRepository } from '../src/features/exercises/exerciseRepository';
import { resolveMedia } from '../src/features/exercises/media/resolveMedia';
import type { ExerciseMedia } from '../src/features/exercises/types';
import { openNodeSqliteDatabase } from '../test-utils/nodeSqliteDatabase';

const catalogue: Catalogue = {
  version: CATALOGUE_VERSION,
  exercises: exerciseCatalogue,
  media: mediaCatalogue,
};

async function freshDatabase() {
  const db = openNodeSqliteDatabase(':memory:');
  await migrate(db);
  return db;
}

describe('migrations', () => {
  test('a new database migrates to the latest version', async () => {
    const db = openNodeSqliteDatabase(':memory:');
    expect(await getSchemaVersion(db)).toBe(0);
    expect(await migrate(db)).toEqual({ from: 0, to: LATEST_SCHEMA_VERSION });
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
  });

  test('running migrations again changes nothing', async () => {
    const db = await freshDatabase();
    expect(await migrate(db)).toEqual({
      from: LATEST_SCHEMA_VERSION,
      to: LATEST_SCHEMA_VERSION,
    });
  });

  test('a failed migration is rolled back and the version is not bumped', async () => {
    const db = await freshDatabase();
    const broken: Migration = {
      version: LATEST_SCHEMA_VERSION + 1,
      name: 'broken',
      statements: ['CREATE TABLE half_done (id TEXT)', 'THIS IS NOT SQL'],
    };
    const { migrations } = jest.requireActual('../src/db/migrations');
    await expect(migrate(db, [...migrations, broken])).rejects.toThrow();

    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    const { rows } = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'half_done'",
    );
    expect(rows).toHaveLength(0);
  });

  test('refuses a database written by a newer app version', async () => {
    const db = await freshDatabase();
    await db.execute(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 5}`);
    await expect(migrate(db)).rejects.toThrow(/newer version of Bodios/);
  });

  test('schema rejects invalid values', async () => {
    const db = await freshDatabase();
    await expect(
      db.execute(
        `INSERT INTO exercises (id, name, aliases, primary_muscles, secondary_muscles, equipment,
           instructions, mistakes, tracking_type, weight_convention, media_id, content_review_status)
         VALUES ('x', 'X', '[]', '[]', '[]', '[]', '[]', '[]', 'sprints', 'none', NULL, 'draft')`,
      ),
    ).rejects.toThrow(/CHECK constraint/);
  });
});

describe('exercise catalogue', () => {
  test('bundled catalogue passes validation', () => {
    expect(validateCatalogue(catalogue)).toEqual([]);
  });

  test('covers every muscle group with about 20 exercises, all flagged as drafts', () => {
    expect(exerciseCatalogue.length).toBeGreaterThanOrEqual(18);
    expect(exerciseCatalogue.length).toBeLessThanOrEqual(24);
    expect(
      exerciseCatalogue.every(e => e.contentReviewStatus === 'draft'),
    ).toBe(true);
  });

  test('each demo clip belongs to its exercise, is bundled and credited', () => {
    const clips = new Map(mediaCatalogue.map(m => [m.id, m]));
    for (const exercise of exerciseCatalogue.filter(e => e.mediaId)) {
      const clip = clips.get(exercise.mediaId!)!;
      expect(clip.exerciseId).toBe(exercise.id);
      expect(clip.reviewStatus).toBe('approved');
      // Bundled, so it plays offline; no remote URLs at all.
      expect(clip.remoteUrl).toBeNull();
      expect(resolveMedia(clip)).toMatchObject({ isRemote: false });
      expect(resolveMedia(clip)?.poster).not.toBeNull();
      expect(clip.source).toMatch(
        /^(wger\.de|Wikimedia Commons|Pexels|Your Move): https:\/\//,
      );
      expect(clip.permissionNotes).toMatch(/Licence: https:\/\//);
      expect(clip.attribution).toMatch(/^Video: “.+” by .+/);
    }
    // One clip per exercise, and every clip is used.
    expect(new Set(mediaCatalogue.map(m => m.exerciseId)).size).toBe(
      mediaCatalogue.length,
    );
    expect(
      exerciseCatalogue.filter(e => e.mediaId).map(e => e.mediaId),
    ).toHaveLength(mediaCatalogue.length);
    // Exercises without a matching licensed clip say so rather than
    // borrowing footage of a different movement.
    expect(
      exerciseCatalogue.filter(e => e.mediaId === null).map(e => e.id),
    ).toEqual(['dead-bug']);
    expect(clips.get('dumbbell-curl-demo')?.attribution).toContain(
      'Biceps Curls With Dumbbell',
    );
  });

  test('dumbbell curl and hammer curl are distinct exercises', () => {
    const curl = exerciseCatalogue.find(e => e.id === 'dumbbell-curl');
    const hammer = exerciseCatalogue.find(e => e.id === 'hammer-curl');
    expect(curl?.name).toBe('Dumbbell Curl');
    expect(hammer?.name).toBe('Hammer Curl');
    expect(curl?.weightConvention).toBe('per_dumbbell');
    expect(hammer?.aliases).not.toContain('Dumbbell Curl');
  });

  test('validation catches broken content', () => {
    const clip: ExerciseMedia = {
      id: 'clip-1',
      exerciseId: 'nope',
      localAssetKey: null,
      remoteUrl: 'http://example.com/a.mp4',
      posterAssetKey: null,
      posterUrl: null,
      durationSeconds: 10,
      source: '',
      permissionNotes: '',
      attribution: null,
      reviewStatus: 'approved',
    };
    const problems = validateCatalogue({
      version: 1,
      exercises: [exerciseCatalogue[0], exerciseCatalogue[0]],
      media: [clip],
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Duplicate exercise id/),
        expect.stringMatching(/unknown exercise/),
        expect.stringMatching(/must use https/),
        expect.stringMatching(/source and permission/),
      ]),
    );
  });
});

describe('syncCatalogue', () => {
  test('seeds once, then leaves the database alone', async () => {
    const db = await freshDatabase();
    expect(await syncCatalogue(db, catalogue)).toBe('seeded');
    expect(await syncCatalogue(db, catalogue)).toBe('unchanged');

    const { rows } = await db.execute('SELECT COUNT(*) AS n FROM exercises');
    expect(rows[0].n).toBe(exerciseCatalogue.length);
  });

  test('a new catalogue version updates rows in place without deleting any', async () => {
    const db = await freshDatabase();
    await syncCatalogue(db, catalogue);

    const renamed = exerciseCatalogue.map(e =>
      e.id === 'dumbbell-curl' ? { ...e, name: 'Dumbbell Biceps Curl' } : e,
    );
    const next = {
      ...catalogue,
      version: catalogue.version + 1,
      exercises: renamed.slice(1),
      media: mediaCatalogue.filter(
        m => m.exerciseId !== exerciseCatalogue[0].id,
      ),
    };
    expect(await syncCatalogue(db, next)).toBe('updated');

    const repo = createExerciseRepository(db);
    expect((await repo.getById('dumbbell-curl'))?.name).toBe(
      'Dumbbell Biceps Curl',
    );
    // The exercise dropped from the new catalogue is kept (history may use it).
    expect(await repo.getById(exerciseCatalogue[0].id)).not.toBeNull();
  });

  test('invalid content is rejected before anything is written', async () => {
    const db = await freshDatabase();
    const bad = {
      ...catalogue,
      exercises: [...exerciseCatalogue, exerciseCatalogue[0]],
    };
    await expect(syncCatalogue(db, bad)).rejects.toThrow(
      /Duplicate exercise id/,
    );
    const { rows } = await db.execute('SELECT COUNT(*) AS n FROM exercises');
    expect(rows[0].n).toBe(0);
  });
});

describe('exercise repository', () => {
  test('lists exercises alphabetically and reads one back intact', async () => {
    const db = await freshDatabase();
    await syncCatalogue(db, catalogue);
    const repo = createExerciseRepository(db);

    const names = (await repo.list()).map(e => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const original = exerciseCatalogue.find(e => e.id === 'dumbbell-curl');
    expect(await repo.getById('dumbbell-curl')).toEqual(original);
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  test('only approved media is returned', async () => {
    const db = await freshDatabase();
    const clip: ExerciseMedia = {
      id: 'curl-demo',
      exerciseId: 'dumbbell-curl',
      localAssetKey: 'dumbbell-curl',
      remoteUrl: null,
      posterAssetKey: null,
      posterUrl: null,
      durationSeconds: 12,
      source: 'Recorded by the owner',
      permissionNotes: 'Owned',
      attribution: null,
      reviewStatus: 'pending',
    };
    const withClip = exerciseCatalogue.map(e => ({
      ...e,
      mediaId: e.id === 'dumbbell-curl' ? 'curl-demo' : null,
    }));
    await syncCatalogue(db, {
      ...catalogue,
      exercises: withClip,
      media: [clip],
    });
    const repo = createExerciseRepository(db);
    const curl = (await repo.getById('dumbbell-curl'))!;
    expect(await repo.getApprovedMedia(curl)).toBeNull();

    await syncCatalogue(db, {
      version: catalogue.version + 1,
      exercises: withClip,
      media: [{ ...clip, reviewStatus: 'approved' }],
    });
    expect(await repo.getApprovedMedia(curl)).toMatchObject({
      id: 'curl-demo',
    });
  });
});

describe('persistence across restarts (file database)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'bodios-db-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('data and the seed timestamp survive closing and reopening', async () => {
    const file = path.join(dir, 'bodios.sqlite');

    const first = openNodeSqliteDatabase(file);
    await migrate(first);
    await syncCatalogue(
      first,
      catalogue,
      () => new Date('2026-09-26T10:00:00Z'),
    );
    first.close();

    const second = openNodeSqliteDatabase(file);
    expect(await migrate(second)).toEqual({
      from: LATEST_SCHEMA_VERSION,
      to: LATEST_SCHEMA_VERSION,
    });
    expect(await syncCatalogue(second, catalogue)).toBe('unchanged');
    expect(await getMeta(second, CATALOGUE_SYNCED_AT_KEY)).toBe(
      '2026-09-26T10:00:00.000Z',
    );
    expect((await createExerciseRepository(second).list()).length).toBe(
      exerciseCatalogue.length,
    );
    second.close();
  });
});
