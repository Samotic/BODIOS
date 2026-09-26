/**
 * @jest-environment node
 *
 * History, best lifts, settings, export and reset against real SQLite.
 */
/// <reference types="node" />

import { syncCatalogue } from '../src/db/catalogue';
import { migrate } from '../src/db/migrations';
import {
  CATALOGUE_VERSION,
  exerciseCatalogue,
} from '../src/data/exerciseCatalogue';
import { mediaCatalogue } from '../src/data/mediaCatalogue';
import {
  createHistoryRepository,
  EXPORT_FORMAT,
} from '../src/features/progress/historyRepository';
import { bestLifts } from '../src/features/progress/metrics';
import { createRoutineRepository } from '../src/features/routines/routineRepository';
import {
  createSettingsRepository,
  SettingsInputError,
} from '../src/features/settings/settingsRepository';
import { createWorkoutRepository } from '../src/features/workouts/workoutRepository';
import { openNodeSqliteDatabase } from '../test-utils/nodeSqliteDatabase';

async function setup() {
  const db = openNodeSqliteDatabase(':memory:');
  await migrate(db);
  await syncCatalogue(db, {
    version: CATALOGUE_VERSION,
    exercises: exerciseCatalogue,
    media: mediaCatalogue,
  });
  const clock = { ms: Date.parse('2026-09-21T10:00:00Z') };
  const now = () => new Date(clock.ms);
  return {
    db,
    clock,
    routines: createRoutineRepository(db, { now }),
    workouts: createWorkoutRepository(db, { now }),
    history: createHistoryRepository(db),
    settings: createSettingsRepository(db),
  };
}

type Env = Awaited<ReturnType<typeof setup>>;

/** Logs one curl workout with the given sets ([kg, reps]) and finishes it. */
async function logCurls(
  env: Env,
  sets: Array<[number, number]>,
  complete = true,
) {
  let routine = (await env.routines.list())[0];
  if (!routine) {
    const created = await env.routines.create('Arms');
    await env.routines.addExercise(created.id, 'dumbbell-curl');
    routine = (await env.routines.list())[0];
  }
  const id = await env.workouts.startFromRoutine(routine.id);
  const session = (await env.workouts.getSession(id))!;
  const rows = session.exercises[0].sets;
  for (let i = 0; i < sets.length; i++) {
    const set = rows[i] ?? rows[0];
    await env.workouts.updateSet(set.id, {
      weightKg: sets[i][0],
      reps: sets[i][1],
    });
    if (complete) {
      await env.workouts.completeSet(set.id);
    }
  }
  env.clock.ms += 45 * 60_000;
  return id;
}

describe('history', () => {
  test('lists finished workouts with completed working sets, newest first', async () => {
    const env = await setup();
    const first = await logCurls(env, [[10, 10]]);
    await env.workouts.finish(first);
    env.clock.ms += 86_400_000;
    const second = await logCurls(env, [
      [12, 8],
      [12, 8],
    ]);
    await env.workouts.finish(second);
    // An in-progress workout isn't history.
    await logCurls(env, [[14, 5]]);

    const list = await env.history.listWorkouts();
    expect(list.map(w => [w.sessionId, w.completedWorkSets])).toEqual([
      [second, 2],
      [first, 1],
    ]);
    expect(list[0].routineName).toBe('Arms');
  });

  test('best lifts come from completed sets of finished workouts only', async () => {
    const env = await setup();
    const a = await logCurls(env, [
      [10, 12],
      [14, 6],
    ]);
    await env.workouts.finish(a);
    await logCurls(env, [[20, 5]]); // still in progress: doesn't count
    const bests = bestLifts(await env.history.liftSets());
    expect(bests).toEqual([
      expect.objectContaining({
        exerciseId: 'dumbbell-curl',
        weightKg: 14,
        reps: 6,
      }),
    ]);
  });

  test('deleting a workout removes it from history and best lifts', async () => {
    const env = await setup();
    const light = await logCurls(env, [[10, 10]]);
    await env.workouts.finish(light);
    const heavy = await logCurls(env, [[16, 5]]);
    await env.workouts.finish(heavy);
    expect(bestLifts(await env.history.liftSets())[0].weightKg).toBe(16);

    await env.history.deleteWorkout(heavy);
    expect((await env.history.listWorkouts()).map(w => w.sessionId)).toEqual([
      light,
    ]);
    expect(bestLifts(await env.history.liftSets())[0].weightKg).toBe(10);
  });

  test('deleteWorkout never touches an in-progress workout', async () => {
    const env = await setup();
    const active = await logCurls(env, [[10, 10]]);
    await env.history.deleteWorkout(active);
    expect(await env.workouts.getActiveSessionId()).toBe(active);
  });
});

describe('settings', () => {
  test('defaults, updates and validation', async () => {
    const env = await setup();
    expect(await env.settings.get()).toEqual({
      preferredUnit: 'kg',
      defaultRestSeconds: 90,
      demoStartMuted: true,
    });
    await env.settings.update({ preferredUnit: 'lb', defaultRestSeconds: 120 });
    expect(await env.settings.get()).toMatchObject({
      preferredUnit: 'lb',
      defaultRestSeconds: 120,
    });
    await expect(
      env.settings.update({ defaultRestSeconds: 601 }),
    ).rejects.toThrow(SettingsInputError);
  });

  test('switching to lb never changes stored kilograms', async () => {
    const env = await setup();
    const id = await logCurls(env, [[12.5, 10]]);
    await env.settings.update({ preferredUnit: 'lb' });
    const set = (await env.workouts.getSession(id))!.exercises[0].sets[0];
    expect(set.weightKg).toBe(12.5);
  });

  test('new routine exercises get the default rest', async () => {
    const env = await setup();
    await env.settings.update({ defaultRestSeconds: 150 });
    const r = await env.routines.create('Rest test');
    const added = await env.routines.addExercise(r.id, 'barbell-bench-press');
    expect(added.restSeconds).toBe(150);
  });
});

describe('export and reset', () => {
  test('export contains routines, finished workouts and settings, in kg', async () => {
    const env = await setup();
    const id = await logCurls(env, [[12.5, 10]]);
    await env.workouts.setNotes(id, 'Felt strong');
    await env.workouts.finish(id);
    await logCurls(env, [[99, 1]]); // in progress: not exported
    await env.settings.update({ preferredUnit: 'lb' });

    const data = await env.history.exportData(new Date('2026-09-26T12:00:00Z'));
    expect(data).toMatchObject({
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: '2026-09-26T12:00:00.000Z',
      weightsIn: 'kg',
      settings: {
        preferredUnit: 'lb',
        defaultRestSeconds: 90,
        demoStartMuted: true,
      },
    });
    expect(data.routines).toEqual([
      expect.objectContaining({
        name: 'Arms',
        exercises: [
          expect.objectContaining({
            exerciseId: 'dumbbell-curl',
            targetSets: 3,
          }),
        ],
      }),
    ]);
    expect(data.workouts).toHaveLength(1);
    expect(data.workouts[0]).toMatchObject({
      routineName: 'Arms',
      notes: 'Felt strong',
      exercises: [
        {
          exerciseId: 'dumbbell-curl',
          weightConvention: 'per_dumbbell',
          sets: [
            expect.objectContaining({ weightKg: 12.5, reps: 10, type: 'work' }),
          ],
        },
      ],
    });
    // Plain data only: it survives a JSON round trip unchanged.
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  test('reset deletes routines, workouts and settings but keeps the exercise library', async () => {
    const env = await setup();
    const id = await logCurls(env, [[10, 10]]);
    await env.workouts.finish(id);
    await logCurls(env, [[10, 10]]); // one in progress too
    await env.settings.update({ preferredUnit: 'lb' });

    await env.history.resetAll();

    expect(await env.routines.list()).toEqual([]);
    expect(await env.history.listWorkouts()).toEqual([]);
    expect(await env.workouts.getActiveSessionId()).toBeNull();
    expect((await env.settings.get()).preferredUnit).toBe('kg');
    const { rows } = await env.db.execute(
      'SELECT COUNT(*) AS n FROM exercises',
    );
    expect(rows[0].n).toBe(exerciseCatalogue.length);
    for (const table of [
      'session_exercises',
      'workout_sets',
      'active_workout_state',
      'routine_exercises',
    ]) {
      const left = await env.db.execute(`SELECT COUNT(*) AS n FROM ${table}`);
      expect([table, left.rows[0].n]).toEqual([table, 0]);
    }
  });
});
