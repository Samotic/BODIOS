/**
 * @jest-environment node
 *
 * Workout sessions against real SQLite (Node's built-in): snapshots,
 * set logging, rest timer, finishing once, discarding and restarts.
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
import { createRoutineRepository } from '../src/features/routines/routineRepository';
import {
  pauseRest,
  remainingMs,
  resumeRest,
  adjustRest,
} from '../src/features/workouts/restTimer';
import { summarize } from '../src/features/workouts/summary';
import {
  createWorkoutRepository,
  WorkoutInProgressError,
  WorkoutInputError,
} from '../src/features/workouts/workoutRepository';
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
  const clock = { ms: Date.parse('2026-09-26T10:00:00Z') };
  const now = () => new Date(clock.ms);
  const routines = createRoutineRepository(db, { now });
  const workouts = createWorkoutRepository(db, { now });
  return { db, routines, workouts, clock };
}

async function armDay(routines: ReturnType<typeof createRoutineRepository>) {
  const routine = await routines.create('Arm day');
  const curl = await routines.addExercise(routine.id, 'dumbbell-curl'); // 3 × 10, 90 s rest
  await routines.addExercise(routine.id, 'plank'); // 3 × 30 s
  await routines.addExercise(routine.id, 'pull-up'); // added weight
  return { routine, curl };
}

describe('starting a workout', () => {
  test('copies the routine into a session with blank planned sets', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const id = await workouts.startFromRoutine(routine.id);

    const session = (await workouts.getSession(id))!;
    expect(session).toMatchObject({
      status: 'in_progress',
      routineName: 'Arm day',
      trainingLocalDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(session.exercises.map(e => [e.name, e.sets.length])).toEqual([
      ['Dumbbell Curl', 3],
      ['Plank', 3],
      ['Pull-Up', 3],
    ]);
    // Nothing is pre-filled: actual values stay blank until entered.
    expect(session.exercises[0].sets[0]).toMatchObject({
      weightKg: null,
      reps: null,
      completedAt: null,
    });
    expect(session.active?.currentSessionExerciseId).toBe(
      session.exercises[0].id,
    );
    expect(await workouts.getActiveSessionId()).toBe(id);
  });

  test('an empty routine cannot be started', async () => {
    const { routines, workouts } = await setup();
    const empty = await routines.create('Empty');
    await expect(workouts.startFromRoutine(empty.id)).rejects.toThrow(
      /Add at least one exercise/,
    );
    expect(await workouts.getActiveSessionId()).toBeNull();
  });

  test('only one workout can be in progress', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const first = await workouts.startFromRoutine(routine.id);
    await expect(workouts.startFromRoutine(routine.id)).rejects.toEqual(
      new WorkoutInProgressError(first),
    );
  });

  test('editing or deleting the routine later does not change the session', async () => {
    const { routines, workouts } = await setup();
    const { routine, curl } = await armDay(routines);
    const id = await workouts.startFromRoutine(routine.id);

    await routines.rename(routine.id, 'Renamed');
    await routines.updateTargets(curl.id, {
      targetSets: 5,
      targetReps: 5,
      targetDurationSeconds: null,
      restSeconds: 30,
    });
    await routines.removeExercise(curl.id);
    let session = (await workouts.getSession(id))!;
    expect(session.routineName).toBe('Arm day');
    expect(session.exercises[0]).toMatchObject({
      name: 'Dumbbell Curl',
      targetSets: 3,
      restSeconds: 90,
    });
    expect(session.exercises[0].sets).toHaveLength(3);

    await routines.remove(routine.id);
    session = (await workouts.getSession(id))!;
    expect(session.routineId).toBeNull();
    expect(session.exercises).toHaveLength(3);
  });
});

describe('logging sets', () => {
  test('complete needs the right values for the exercise type', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const s = (await workouts.getSession(
      await workouts.startFromRoutine(routine.id),
    ))!;
    const [curl, plank, pullUp] = s.exercises;

    await expect(workouts.completeSet(curl.sets[0].id)).rejects.toThrow(
      'Enter reps first.',
    );
    await workouts.updateSet(curl.sets[0].id, { reps: 10 });
    await expect(workouts.completeSet(curl.sets[0].id)).rejects.toThrow(
      'Enter the weight first.',
    );
    await workouts.updateSet(curl.sets[0].id, { weightKg: 12.5 });
    expect(await workouts.completeSet(curl.sets[0].id)).toBe('completed');

    // Timed: needs a duration, not reps.
    await expect(workouts.completeSet(plank.sets[0].id)).rejects.toThrow(
      'Enter the time first.',
    );
    await workouts.updateSet(plank.sets[0].id, { durationSeconds: 45 });
    expect(await workouts.completeSet(plank.sets[0].id)).toBe('completed');

    // Added weight: blank weight means bodyweight only; zero is fine too.
    await workouts.updateSet(pullUp.sets[0].id, { reps: 8 });
    expect(await workouts.completeSet(pullUp.sets[0].id)).toBe('completed');
    await workouts.updateSet(pullUp.sets[1].id, { reps: 6, weightKg: 0 });
    expect(await workouts.completeSet(pullUp.sets[1].id)).toBe('completed');
  });

  test('rejects impossible values before saving', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const s = (await workouts.getSession(
      await workouts.startFromRoutine(routine.id),
    ))!;
    const set = s.exercises[0].sets[0];
    await expect(workouts.updateSet(set.id, { weightKg: -5 })).rejects.toThrow(
      WorkoutInputError,
    );
    await expect(
      workouts.updateSet(set.id, { weightKg: 5000 }),
    ).rejects.toThrow(WorkoutInputError);
    await expect(workouts.updateSet(set.id, { reps: 2.5 })).rejects.toThrow(
      WorkoutInputError,
    );
    await expect(
      workouts.updateSet(set.id, { reps: 0 }),
    ).resolves.toBeUndefined();
    await expect(workouts.completeSet(set.id)).rejects.toThrow(
      'Enter reps first.',
    );
  });

  test('completing twice does nothing the second time (double tap)', async () => {
    const { routines, workouts, clock } = await setup();
    const { routine } = await armDay(routines);
    const s = (await workouts.getSession(
      await workouts.startFromRoutine(routine.id),
    ))!;
    const set = s.exercises[0].sets[0];
    await workouts.updateSet(set.id, { reps: 10, weightKg: 10 });

    const results = await Promise.all([
      workouts.completeSet(set.id),
      workouts.completeSet(set.id),
    ]);
    expect(results.sort()).toEqual(['already-completed', 'completed']);
    clock.ms += 5000;
    expect(await workouts.completeSet(set.id)).toBe('already-completed');

    const after = (await workouts.getSession(s.id))!;
    expect(after.exercises[0].sets.filter(x => x.completedAt)).toHaveLength(1);
    expect(after.exercises[0].sets[0].completedAt).toBe(
      '2026-09-26T10:00:00.000Z',
    );
  });

  test('undo, add and remove sets', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const s = (await workouts.getSession(
      await workouts.startFromRoutine(routine.id),
    ))!;
    const curl = s.exercises[0];
    await workouts.updateSet(curl.sets[0].id, { reps: 10, weightKg: 10 });
    await workouts.completeSet(curl.sets[0].id);
    await expect(
      workouts.updateSet(curl.sets[0].id, { reps: null }),
    ).rejects.toThrow(/Undo this set/);
    await workouts.uncompleteSet(curl.sets[0].id);
    await workouts.addSet(curl.id);
    await workouts.removeSet(curl.sets[1].id);

    const after = (await workouts.getSession(s.id))!.exercises[0].sets;
    expect(after).toHaveLength(3);
    expect(after[0]).toMatchObject({ completedAt: null, reps: 10 });
  });
});

describe('rest timer', () => {
  test('starts on completion from the stored end time and survives a restart', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'bodios-rest-'));
    try {
      const file = path.join(dir, 'bodios.sqlite');
      const first = await setup(file);
      const { routine } = await armDay(first.routines);
      const id = await first.workouts.startFromRoutine(routine.id);
      const set = (await first.workouts.getSession(id))!.exercises[0].sets[0];
      await first.workouts.updateSet(set.id, { reps: 10, weightKg: 10 });
      await first.workouts.completeSet(set.id);
      first.db.close();

      // "Force quit", then reopen 30 seconds later.
      const second = await setup(file);
      const session = (await second.workouts.getSession(id))!;
      const rest = session.active!.rest;
      expect(rest.durationMs).toBe(90_000);
      expect(remainingMs(rest, Date.parse('2026-09-26T10:00:30Z'))).toBe(
        60_000,
      );
      expect(session.exercises[0].sets[0]).toMatchObject({
        reps: 10,
        weightKg: 10,
      });
      expect(session.exercises[0].sets[0].completedAt).not.toBeNull();
      second.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('pause, adjust and resume are stored', async () => {
    const { routines, workouts, clock } = await setup();
    const { routine } = await armDay(routines);
    const id = await workouts.startFromRoutine(routine.id);
    const set = (await workouts.getSession(id))!.exercises[0].sets[0];
    await workouts.updateSet(set.id, { reps: 10, weightKg: 10 });
    await workouts.completeSet(set.id);

    clock.ms += 20_000;
    await workouts.updateRest(id, pauseRest);
    clock.ms += 600_000; // paused time doesn't count
    await workouts.updateRest(id, (t, now) => adjustRest(t, 15_000, now));
    let rest = (await workouts.getSession(id))!.active!.rest;
    expect(remainingMs(rest, clock.ms)).toBe(85_000);

    await workouts.updateRest(id, resumeRest);
    clock.ms += 5_000;
    rest = (await workouts.getSession(id))!.active!.rest;
    expect(remainingMs(rest, clock.ms)).toBe(80_000);
  });
});

describe('finishing and discarding', () => {
  test('finishes exactly once and keeps only completed sets', async () => {
    const { routines, workouts, clock } = await setup();
    const { routine } = await armDay(routines);
    const id = await workouts.startFromRoutine(routine.id);
    const s = (await workouts.getSession(id))!;

    await expect(workouts.finish(id)).rejects.toThrow(
      /Complete at least one set/,
    );

    await workouts.updateSet(s.exercises[0].sets[0].id, {
      reps: 10,
      weightKg: 12,
    });
    await workouts.completeSet(s.exercises[0].sets[0].id);
    await workouts.updateSet(s.exercises[0].sets[1].id, {
      reps: 8,
      weightKg: 12,
    }); // not completed
    clock.ms += 40 * 60_000;

    const results = await Promise.all([
      workouts.finish(id),
      workouts.finish(id),
    ]);
    expect(results.sort()).toEqual(['already-finished', 'finished']);
    expect(await workouts.finish(id)).toBe('already-finished');

    const finished = (await workouts.getSession(id))!;
    expect(finished.status).toBe('finished');
    expect(finished.active).toBeNull();
    expect(finished.exercises[0].sets).toHaveLength(1);
    expect(await workouts.getActiveSessionId()).toBeNull();

    const summary = summarize(finished);
    expect(summary.durationMs).toBe(40 * 60_000);
    expect(summary.completedSetCount).toBe(1);
    expect(summary.exercises.map(e => e.name)).toEqual(['Dumbbell Curl']);

    // A finished workout can't be edited through the logger.
    await expect(workouts.addSet(finished.exercises[0].id)).rejects.toThrow(
      /already finished/,
    );
  });

  test('discard deletes the in-progress workout only', async () => {
    const { routines, workouts } = await setup();
    const { routine } = await armDay(routines);
    const id = await workouts.startFromRoutine(routine.id);
    await workouts.discard(id);
    expect(await workouts.getSession(id)).toBeNull();
    expect(await workouts.getActiveSessionId()).toBeNull();

    // A new one can start afterwards.
    await expect(workouts.startFromRoutine(routine.id)).resolves.toEqual(
      expect.any(String),
    );
  });

  test('previous performance comes from the last finished workout', async () => {
    const { routines, workouts, clock } = await setup();
    const { routine } = await armDay(routines);

    const first = await workouts.startFromRoutine(routine.id);
    let s = (await workouts.getSession(first))!;
    for (const [i, reps] of [10, 9].entries()) {
      await workouts.updateSet(s.exercises[0].sets[i].id, {
        reps,
        weightKg: 12,
      });
      await workouts.completeSet(s.exercises[0].sets[i].id);
    }
    clock.ms += 3_600_000;
    await workouts.finish(first);

    clock.ms += 86_400_000;
    const second = await workouts.startFromRoutine(routine.id);
    s = (await workouts.getSession(second))!;
    const previous = await workouts.getPreviousPerformance(
      'dumbbell-curl',
      'per_dumbbell',
      second,
    );
    expect(previous?.sets).toEqual([
      { weightKg: 12, reps: 10, durationSeconds: null },
      { weightKg: 12, reps: 9, durationSeconds: null },
    ]);

    // Copying is explicit and only fills blank, unfinished sets.
    expect(await workouts.copyPrevious(s.exercises[0].id, previous!)).toBe(2);
    const copied = (await workouts.getSession(second))!.exercises[0].sets;
    expect(copied.map(x => [x.weightKg, x.reps, x.completedAt])).toEqual([
      [12, 10, null],
      [12, 9, null],
      [null, null, null],
    ]);

    expect(
      await workouts.getPreviousPerformance('plank', 'none', second),
    ).toBeNull();
  });
});

test('schema 2 databases upgrade to the latest schema keeping routines', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'bodios-up3-'));
  try {
    const file = path.join(dir, 'old.sqlite');
    const old = openNodeSqliteDatabase(file);
    await migrate(old, migrations.slice(0, 2));
    await syncCatalogue(old, catalogue);
    const r = await createRoutineRepository(old).create('Kept');
    old.close();

    const db = openNodeSqliteDatabase(file);
    expect(await migrate(db)).toEqual({ from: 2, to: LATEST_SCHEMA_VERSION });
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    expect((await createRoutineRepository(db).get(r.id))?.name).toBe('Kept');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
