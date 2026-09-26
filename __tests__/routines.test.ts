/**
 * @jest-environment node
 *
 * Routine storage against real SQLite (Node's built-in).
 */
/// <reference types="node" />

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncCatalogue } from '../src/db/catalogue';
import {
  getSchemaVersion,
  LATEST_SCHEMA_VERSION,
  migrate,
  migrations,
} from '../src/db/migrations';
import {
  CATALOGUE_VERSION,
  exerciseCatalogue,
} from '../src/data/exerciseCatalogue';
import { mediaCatalogue } from '../src/data/mediaCatalogue';
import {
  createRoutineRepository,
  RoutineInputError,
} from '../src/features/routines/routineRepository';
import {
  canStartRoutine,
  checkRoutineName,
  checkTargets,
  formatSeconds,
} from '../src/features/routines/rules';
import { openNodeSqliteDatabase } from '../test-utils/nodeSqliteDatabase';

const catalogue = {
  version: CATALOGUE_VERSION,
  exercises: exerciseCatalogue,
  media: mediaCatalogue,
};

async function setup(file = ':memory:') {
  const db = openNodeSqliteDatabase(file);
  await migrate(db);
  await syncCatalogue(db, catalogue);
  let clock = Date.parse('2026-09-26T10:00:00Z');
  const onChange = jest.fn();
  const repo = createRoutineRepository(db, {
    now: () => new Date((clock += 1000)),
    onChange,
  });
  return { db, repo, onChange };
}

describe('routine repository', () => {
  test('create, rename and list with exercise counts, newest first', async () => {
    const { repo, onChange } = await setup();
    const push = await repo.create('  Push   day ');
    expect(push.name).toBe('Push day');
    const legs = await repo.create('Legs');
    await repo.addExercise(push.id, 'barbell-bench-press');
    await repo.rename(legs.id, 'Leg day');

    expect((await repo.list()).map(r => [r.name, r.exerciseCount])).toEqual([
      ['Leg day', 0],
      ['Push day', 1],
    ]);
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  test('rejects bad names without writing anything', async () => {
    const { repo, onChange } = await setup();
    await expect(repo.create('   ')).rejects.toThrow(RoutineInputError);
    await expect(repo.create('x'.repeat(61))).rejects.toThrow(/60 characters/);
    expect(await repo.list()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('adds exercises at the end with defaults that fit how they are logged', async () => {
    const { repo } = await setup();
    const r = await repo.create('Full body');
    await repo.addExercise(r.id, 'dumbbell-curl');
    await repo.addExercise(r.id, 'plank');

    const routine = (await repo.get(r.id))!;
    expect(routine.exercises.map(e => [e.exerciseName, e.position])).toEqual([
      ['Dumbbell Curl', 0],
      ['Plank', 1],
    ]);
    expect(routine.exercises[0]).toMatchObject({
      targetSets: 3,
      targetReps: 10,
      targetDurationSeconds: null,
      weightConvention: 'per_dumbbell',
    });
    expect(routine.exercises[1]).toMatchObject({
      targetReps: null,
      targetDurationSeconds: 30,
      trackingType: 'duration',
    });
  });

  test('the same exercise can appear twice (e.g. two blocks)', async () => {
    const { repo } = await setup();
    const r = await repo.create('Arms');
    await repo.addExercise(r.id, 'dumbbell-curl');
    await repo.addExercise(r.id, 'dumbbell-curl');
    expect((await repo.get(r.id))!.exercises).toHaveLength(2);
  });

  test('refuses unknown exercises and routines', async () => {
    const { repo } = await setup();
    const r = await repo.create('Arms');
    await expect(repo.addExercise(r.id, 'made-up')).rejects.toThrow(
      /isn’t in the library/,
    );
    await expect(
      repo.addExercise('no-such-routine', 'dumbbell-curl'),
    ).rejects.toThrow(/no longer exists/);
  });

  test('updates targets and validates them against the tracking type', async () => {
    const { repo } = await setup();
    const r = await repo.create('Arms');
    const curl = await repo.addExercise(r.id, 'dumbbell-curl');
    const plank = await repo.addExercise(r.id, 'plank');

    await repo.updateTargets(curl.id, {
      targetSets: 4,
      targetReps: 8,
      targetDurationSeconds: null,
      restSeconds: 120,
    });
    expect((await repo.get(r.id))!.exercises[0]).toMatchObject({
      targetSets: 4,
      targetReps: 8,
      restSeconds: 120,
    });

    await expect(
      repo.updateTargets(curl.id, {
        targetSets: 0,
        targetReps: 8,
        targetDurationSeconds: null,
        restSeconds: 90,
      }),
    ).rejects.toThrow(/Sets must be/);
    await expect(
      repo.updateTargets(plank.id, {
        targetSets: 3,
        targetReps: 10,
        targetDurationSeconds: null,
        restSeconds: 60,
      }),
    ).rejects.toThrow(/Time must be/);
  });

  test('moves exercises up and down, and ignores moves past the ends', async () => {
    const { repo } = await setup();
    const r = await repo.create('Order');
    const a = await repo.addExercise(r.id, 'dumbbell-curl');
    await repo.addExercise(r.id, 'hammer-curl');
    const c = await repo.addExercise(r.id, 'plank');
    const names = async () =>
      (await repo.get(r.id))!.exercises.map(e => e.exerciseName);

    await repo.moveExercise(c.id, 'up');
    expect(await names()).toEqual(['Dumbbell Curl', 'Plank', 'Hammer Curl']);
    await repo.moveExercise(a.id, 'down');
    expect(await names()).toEqual(['Plank', 'Dumbbell Curl', 'Hammer Curl']);
    await repo.moveExercise(c.id, 'up'); // already first
    expect(await names()).toEqual(['Plank', 'Dumbbell Curl', 'Hammer Curl']);
  });

  test('removing an exercise closes the gap in positions', async () => {
    const { repo } = await setup();
    const r = await repo.create('Gaps');
    await repo.addExercise(r.id, 'dumbbell-curl');
    const middle = await repo.addExercise(r.id, 'hammer-curl');
    await repo.addExercise(r.id, 'plank');
    await repo.removeExercise(middle.id);
    expect((await repo.get(r.id))!.exercises.map(e => e.position)).toEqual([
      0, 1,
    ]);
  });

  test('deleting a routine deletes its exercises too', async () => {
    const { db, repo } = await setup();
    const r = await repo.create('Temp');
    await repo.addExercise(r.id, 'dumbbell-curl');
    await repo.remove(r.id);
    expect(await repo.get(r.id)).toBeNull();
    const { rows } = await db.execute(
      'SELECT COUNT(*) AS n FROM routine_exercises',
    );
    expect(rows[0].n).toBe(0);
  });

  test('edits bump updated_at so recently edited routines come first', async () => {
    const { repo } = await setup();
    const a = await repo.create('A');
    await repo.create('B');
    await repo.addExercise(a.id, 'plank');
    expect((await repo.list())[0].name).toBe('A');
  });
});

describe('persistence and upgrades', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'bodios-routines-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('a routine survives closing and reopening the database', async () => {
    const file = path.join(dir, 'bodios.sqlite');
    const first = await setup(file);
    const r = await first.repo.create('Push day');
    await first.repo.addExercise(r.id, 'barbell-bench-press');
    first.db.close();

    const second = await setup(file);
    expect(await second.repo.get(r.id)).toMatchObject({
      name: 'Push day',
      exercises: [
        expect.objectContaining({ exerciseId: 'barbell-bench-press' }),
      ],
    });
    second.db.close();
  });

  test('an existing Stage 2 database (schema 1) upgrades without losing data', async () => {
    const file = path.join(dir, 'old.sqlite');
    const old = openNodeSqliteDatabase(file);
    await migrate(old, migrations.slice(0, 1));
    await syncCatalogue(old, catalogue);
    expect(await getSchemaVersion(old)).toBe(1);
    old.close();

    const upgraded = openNodeSqliteDatabase(file);
    expect(await migrate(upgraded)).toEqual({
      from: 1,
      to: LATEST_SCHEMA_VERSION,
    });
    const { rows } = await upgraded.execute(
      'SELECT COUNT(*) AS n FROM exercises',
    );
    expect(rows[0].n).toBe(exerciseCatalogue.length);
    const repo = createRoutineRepository(upgraded);
    const r = await repo.create('After upgrade');
    await repo.addExercise(r.id, 'dumbbell-curl');
    expect((await repo.get(r.id))!.exercises).toHaveLength(1);
    upgraded.close();
  });
});

describe('routine rules', () => {
  test('checkRoutineName', () => {
    expect(checkRoutineName(' Push  day ')).toEqual({
      ok: true,
      name: 'Push day',
    });
    expect(checkRoutineName('')).toMatchObject({ ok: false });
  });

  test('checkTargets allows valid targets only', () => {
    const ok = {
      targetSets: 3,
      targetReps: 10,
      targetDurationSeconds: null,
      restSeconds: 90,
    };
    expect(checkTargets(ok, 'weight_reps')).toEqual([]);
    expect(checkTargets({ ...ok, targetReps: 2.5 }, 'reps')).toHaveLength(1);
    expect(
      checkTargets({ ...ok, restSeconds: 601 }, 'weight_reps'),
    ).toHaveLength(1);
    expect(
      checkTargets(
        { ...ok, targetReps: null, targetDurationSeconds: 45 },
        'duration',
      ),
    ).toEqual([]);
  });

  test('an empty routine cannot be started', () => {
    expect(canStartRoutine({ exercises: [] })).toBe(false);
    expect(canStartRoutine({ exercises: [{}] })).toBe(true);
  });

  test('formatSeconds', () => {
    expect(formatSeconds(45)).toBe('45 s');
    expect(formatSeconds(90)).toBe('1 min 30 s');
    expect(formatSeconds(120)).toBe('2 min');
  });
});
