import type { Database, Row, SqlExecutor } from '../../db/types';
import { currentTimeZone, localDateString } from '../../lib/dates';
import { createId } from '../../lib/id';
import type { TrackingType, WeightConvention } from '../exercises/types';
import { noRest, startRest, type RestTimer } from './restTimer';
import {
  MAX_DURATION_SECONDS,
  MAX_REPS,
  MAX_WEIGHT_KG,
  missingForCompletion,
} from './setRules';
import type {
  ActiveState,
  PreviousPerformance,
  SessionDetail,
  SessionExercise,
  WorkoutSession,
  WorkoutSet,
} from './types';

/** Input the user can fix; the message is safe to show. */
export class WorkoutInputError extends Error {}

/** Starting a workout while another is still in progress. */
export class WorkoutInProgressError extends Error {
  constructor(readonly sessionId: string) {
    super('Another workout is still in progress.');
  }
}

export type SetValues = Pick<
  WorkoutSet,
  'weightKg' | 'reps' | 'durationSeconds'
>;

export type WorkoutRepository = {
  getActiveSessionId(): Promise<string | null>;
  /** Copies the routine into a new in-progress session. Returns its id. */
  startFromRoutine(routineId: string): Promise<string>;
  getSession(sessionId: string): Promise<SessionDetail | null>;
  updateSet(setId: string, values: Partial<SetValues>): Promise<void>;
  /** Marks a set done and starts its rest timer. Safe to call twice. */
  completeSet(setId: string): Promise<'completed' | 'already-completed'>;
  uncompleteSet(setId: string): Promise<void>;
  addSet(sessionExerciseId: string): Promise<void>;
  removeSet(setId: string): Promise<void>;
  /** Fills blank, unfinished sets from last time. Returns how many were filled. */
  copyPrevious(
    sessionExerciseId: string,
    previous: PreviousPerformance,
  ): Promise<number>;
  setCurrentExercise(
    sessionId: string,
    sessionExerciseId: string,
  ): Promise<void>;
  setNotes(sessionId: string, notes: string): Promise<void>;
  updateRest(
    sessionId: string,
    change: (timer: RestTimer, now: number) => RestTimer,
  ): Promise<RestTimer>;
  /** Finishes exactly once; a repeat call reports 'already-finished'. */
  finish(sessionId: string): Promise<'finished' | 'already-finished'>;
  /** Deletes an in-progress workout. Finished workouts are never touched. */
  discard(sessionId: string): Promise<void>;
  getPreviousPerformance(
    exerciseId: string,
    weightConvention: WeightConvention,
    excludeSessionId: string,
  ): Promise<PreviousPerformance | null>;
};

type Options = {
  now?: () => Date;
  onChange?: () => void;
};

const MAX_NOTES = 2000;

export function createWorkoutRepository(
  db: Database,
  { now = () => new Date(), onChange = () => {} }: Options = {},
): WorkoutRepository {
  async function write<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const result = await db.transaction(work);
    onChange();
    return result;
  }

  /** The set, its exercise snapshot and its session, if still in progress. */
  async function findEditableSet(tx: SqlExecutor, setId: string) {
    const { rows } = await tx.execute(
      `SELECT ws.*, se.session_id, se.tracking_type_snapshot, se.weight_convention_snapshot,
              se.rest_seconds, s.status
       FROM workout_sets ws
       JOIN session_exercises se ON se.id = ws.session_exercise_id
       JOIN workout_sessions s ON s.id = se.session_id
       WHERE ws.id = ?`,
      [setId],
    );
    if (rows.length === 0) {
      throw new WorkoutInputError('That set no longer exists.');
    }
    const row = rows[0];
    if (row.status !== 'in_progress') {
      throw new WorkoutInputError('This workout has already finished.');
    }
    return {
      set: rowToSet(row),
      sessionId: String(row.session_id),
      trackingType: String(row.tracking_type_snapshot) as TrackingType,
      weightConvention: String(
        row.weight_convention_snapshot,
      ) as WeightConvention,
      restSeconds: Number(row.rest_seconds),
    };
  }

  async function findEditableExercise(
    tx: SqlExecutor,
    sessionExerciseId: string,
  ) {
    const { rows } = await tx.execute(
      `SELECT se.*, s.status FROM session_exercises se
       JOIN workout_sessions s ON s.id = se.session_id WHERE se.id = ?`,
      [sessionExerciseId],
    );
    if (rows.length === 0) {
      throw new WorkoutInputError(
        'That exercise is no longer in this workout.',
      );
    }
    if (rows[0].status !== 'in_progress') {
      throw new WorkoutInputError('This workout has already finished.');
    }
    return rows[0];
  }

  async function requireInProgress(tx: SqlExecutor, sessionId: string) {
    const { rows } = await tx.execute(
      'SELECT status FROM workout_sessions WHERE id = ?',
      [sessionId],
    );
    if (rows.length === 0 || rows[0].status !== 'in_progress') {
      throw new WorkoutInputError('This workout is no longer in progress.');
    }
  }

  async function readRest(
    tx: SqlExecutor,
    sessionId: string,
  ): Promise<RestTimer> {
    const { rows } = await tx.execute(
      'SELECT * FROM active_workout_state WHERE session_id = ?',
      [sessionId],
    );
    return rows.length > 0 ? rowToRest(rows[0]) : noRest;
  }

  async function writeRest(
    tx: SqlExecutor,
    sessionId: string,
    timer: RestTimer,
  ) {
    await tx.execute(
      `UPDATE active_workout_state
       SET rest_ends_at = ?, rest_paused_remaining_ms = ?, rest_duration_ms = ?
       WHERE session_id = ?`,
      [
        timer.endsAt === null ? null : new Date(timer.endsAt).toISOString(),
        timer.pausedRemainingMs,
        timer.durationMs,
        sessionId,
      ],
    );
  }

  function checkValues(values: Partial<SetValues>) {
    const { weightKg, reps, durationSeconds } = values;
    if (
      weightKg != null &&
      !(Number.isFinite(weightKg) && weightKg >= 0 && weightKg <= MAX_WEIGHT_KG)
    ) {
      throw new WorkoutInputError('Weight must be between 0 and 1000 kg.');
    }
    if (
      reps != null &&
      !(Number.isInteger(reps) && reps >= 0 && reps <= MAX_REPS)
    ) {
      throw new WorkoutInputError('Reps must be a whole number.');
    }
    if (
      durationSeconds != null &&
      !(
        Number.isInteger(durationSeconds) &&
        durationSeconds >= 0 &&
        durationSeconds <= MAX_DURATION_SECONDS
      )
    ) {
      throw new WorkoutInputError('Time must be a whole number of seconds.');
    }
  }

  return {
    async getActiveSessionId() {
      const { rows } = await db.execute(
        "SELECT id FROM workout_sessions WHERE status = 'in_progress' LIMIT 1",
      );
      return rows.length > 0 ? String(rows[0].id) : null;
    },

    async startFromRoutine(routineId) {
      return write(async tx => {
        const active = await tx.execute(
          "SELECT id FROM workout_sessions WHERE status = 'in_progress' LIMIT 1",
        );
        if (active.rows.length > 0) {
          throw new WorkoutInProgressError(String(active.rows[0].id));
        }
        const routine = await tx.execute(
          'SELECT name FROM routines WHERE id = ?',
          [routineId],
        );
        if (routine.rows.length === 0) {
          throw new WorkoutInputError('That routine no longer exists.');
        }
        const items = await tx.execute(
          `SELECT re.*, e.name, e.tracking_type, e.weight_convention
           FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
           WHERE re.routine_id = ? ORDER BY re.position`,
          [routineId],
        );
        if (items.rows.length === 0) {
          throw new WorkoutInputError(
            'Add at least one exercise before starting this routine.',
          );
        }

        const startedAt = now();
        const sessionId = createId();
        await tx.execute(
          `INSERT INTO workout_sessions (
             id, routine_id, routine_name_snapshot, status, started_at,
             training_local_date, timezone
           ) VALUES (?, ?, ?, 'in_progress', ?, ?, ?)`,
          [
            sessionId,
            routineId,
            String(routine.rows[0].name),
            startedAt.toISOString(),
            localDateString(startedAt),
            currentTimeZone(),
          ],
        );

        let firstExerciseId: string | null = null;
        for (let index = 0; index < items.rows.length; index++) {
          const item = items.rows[index];
          const sessionExerciseId = createId();
          firstExerciseId ??= sessionExerciseId;
          await tx.execute(
            `INSERT INTO session_exercises (
               id, session_id, exercise_id, position, name_snapshot,
               tracking_type_snapshot, weight_convention_snapshot, target_sets,
               target_reps, target_duration_seconds, rest_seconds
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sessionExerciseId,
              sessionId,
              String(item.exercise_id),
              index,
              String(item.name),
              String(item.tracking_type),
              String(item.weight_convention),
              Number(item.target_sets),
              nullableNumber(item.target_reps),
              nullableNumber(item.target_duration_seconds),
              Number(item.rest_seconds),
            ],
          );
          // Blank rows for the planned sets. Values stay empty until entered.
          for (let set = 0; set < Number(item.target_sets); set++) {
            await tx.execute(
              'INSERT INTO workout_sets (id, session_exercise_id, position) VALUES (?, ?, ?)',
              [createId(), sessionExerciseId, set],
            );
          }
        }

        await tx.execute(
          'INSERT INTO active_workout_state (session_id, current_session_exercise_id) VALUES (?, ?)',
          [sessionId, firstExerciseId],
        );
        return sessionId;
      });
    },

    async getSession(sessionId) {
      const session = await db.execute(
        'SELECT * FROM workout_sessions WHERE id = ?',
        [sessionId],
      );
      if (session.rows.length === 0) {
        return null;
      }
      const exercises = await db.execute(
        'SELECT * FROM session_exercises WHERE session_id = ? ORDER BY position',
        [sessionId],
      );
      const sets = await db.execute(
        `SELECT ws.* FROM workout_sets ws
         JOIN session_exercises se ON se.id = ws.session_exercise_id
         WHERE se.session_id = ? ORDER BY ws.position`,
        [sessionId],
      );
      const state = await db.execute(
        'SELECT * FROM active_workout_state WHERE session_id = ?',
        [sessionId],
      );

      const setsByExercise = new Map<string, WorkoutSet[]>();
      for (const row of sets.rows) {
        const set = rowToSet(row);
        const list = setsByExercise.get(set.sessionExerciseId) ?? [];
        list.push(set);
        setsByExercise.set(set.sessionExerciseId, list);
      }

      const active: ActiveState | null =
        state.rows.length > 0
          ? {
              currentSessionExerciseId: nullableString(
                state.rows[0].current_session_exercise_id,
              ),
              rest: rowToRest(state.rows[0]),
            }
          : null;

      return {
        ...rowToSession(session.rows[0]),
        exercises: exercises.rows.map(row => ({
          ...rowToSessionExercise(row),
          sets: setsByExercise.get(String(row.id)) ?? [],
        })),
        active,
      };
    },

    async updateSet(setId, values) {
      checkValues(values);
      await write(async tx => {
        const found = await findEditableSet(tx, setId);
        const next: SetValues = {
          weightKg:
            values.weightKg !== undefined
              ? values.weightKg
              : found.set.weightKg,
          reps: values.reps !== undefined ? values.reps : found.set.reps,
          durationSeconds:
            values.durationSeconds !== undefined
              ? values.durationSeconds
              : found.set.durationSeconds,
        };
        if (found.set.completedAt !== null) {
          const missing = missingForCompletion(
            next,
            found.trackingType,
            found.weightConvention,
          );
          if (missing) {
            throw new WorkoutInputError(
              'Undo this set before clearing its values.',
            );
          }
        }
        await tx.execute(
          'UPDATE workout_sets SET weight_kg = ?, reps = ?, duration_seconds = ? WHERE id = ?',
          [next.weightKg, next.reps, next.durationSeconds, setId],
        );
      });
    },

    async completeSet(setId) {
      return write(async tx => {
        const found = await findEditableSet(tx, setId);
        if (found.set.completedAt !== null) {
          return 'already-completed' as const;
        }
        const missing = missingForCompletion(
          found.set,
          found.trackingType,
          found.weightConvention,
        );
        if (missing) {
          throw new WorkoutInputError(missing);
        }
        const at = now();
        await tx.execute(
          'UPDATE workout_sets SET completed_at = ? WHERE id = ? AND completed_at IS NULL',
          [at.toISOString(), setId],
        );
        await writeRest(
          tx,
          found.sessionId,
          found.restSeconds > 0
            ? startRest(found.restSeconds * 1000, at.getTime())
            : noRest,
        );
        return 'completed' as const;
      });
    },

    async uncompleteSet(setId) {
      await write(async tx => {
        await findEditableSet(tx, setId);
        await tx.execute(
          'UPDATE workout_sets SET completed_at = NULL WHERE id = ?',
          [setId],
        );
      });
    },

    async addSet(sessionExerciseId) {
      await write(async tx => {
        await findEditableExercise(tx, sessionExerciseId);
        const { rows } = await tx.execute(
          'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM workout_sets WHERE session_exercise_id = ?',
          [sessionExerciseId],
        );
        await tx.execute(
          'INSERT INTO workout_sets (id, session_exercise_id, position) VALUES (?, ?, ?)',
          [createId(), sessionExerciseId, Number(rows[0].next)],
        );
      });
    },

    async removeSet(setId) {
      await write(async tx => {
        await findEditableSet(tx, setId);
        await tx.execute('DELETE FROM workout_sets WHERE id = ?', [setId]);
      });
    },

    async copyPrevious(sessionExerciseId, previous) {
      return write(async tx => {
        await findEditableExercise(tx, sessionExerciseId);
        const { rows } = await tx.execute(
          'SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY position',
          [sessionExerciseId],
        );
        let filled = 0;
        for (let index = 0; index < rows.length; index++) {
          const set = rowToSet(rows[index]);
          const source = previous.sets[index];
          const blank =
            set.weightKg === null &&
            set.reps === null &&
            set.durationSeconds === null;
          if (!source || set.completedAt !== null || !blank) {
            continue;
          }
          await tx.execute(
            'UPDATE workout_sets SET weight_kg = ?, reps = ?, duration_seconds = ? WHERE id = ?',
            [source.weightKg, source.reps, source.durationSeconds, set.id],
          );
          filled++;
        }
        return filled;
      });
    },

    async setCurrentExercise(sessionId, sessionExerciseId) {
      await write(async tx => {
        await requireInProgress(tx, sessionId);
        await tx.execute(
          `UPDATE active_workout_state SET current_session_exercise_id = ?
           WHERE session_id = ? AND EXISTS (
             SELECT 1 FROM session_exercises WHERE id = ? AND session_id = ?
           )`,
          [sessionExerciseId, sessionId, sessionExerciseId, sessionId],
        );
      });
    },

    async setNotes(sessionId, notes) {
      if (notes.length > MAX_NOTES) {
        throw new WorkoutInputError(
          `Notes can be up to ${MAX_NOTES} characters.`,
        );
      }
      await write(tx =>
        tx.execute('UPDATE workout_sessions SET notes = ? WHERE id = ?', [
          notes,
          sessionId,
        ]),
      );
    },

    async updateRest(sessionId, change) {
      return write(async tx => {
        await requireInProgress(tx, sessionId);
        const next = change(await readRest(tx, sessionId), now().getTime());
        await writeRest(tx, sessionId, next);
        return next;
      });
    },

    async finish(sessionId) {
      return write(async tx => {
        const { rows } = await tx.execute(
          'SELECT status FROM workout_sessions WHERE id = ?',
          [sessionId],
        );
        if (rows.length === 0) {
          throw new WorkoutInputError('This workout no longer exists.');
        }
        if (rows[0].status === 'finished') {
          return 'already-finished' as const;
        }
        const done = await tx.execute(
          `SELECT COUNT(*) AS n FROM workout_sets ws
           JOIN session_exercises se ON se.id = ws.session_exercise_id
           WHERE se.session_id = ? AND ws.completed_at IS NOT NULL`,
          [sessionId],
        );
        if (Number(done.rows[0].n) === 0) {
          throw new WorkoutInputError(
            'Complete at least one set before finishing, or discard the workout.',
          );
        }
        // History keeps only what was actually done.
        await tx.execute(
          `DELETE FROM workout_sets WHERE completed_at IS NULL AND session_exercise_id IN (
             SELECT id FROM session_exercises WHERE session_id = ?
           )`,
          [sessionId],
        );
        await tx.execute(
          "UPDATE workout_sessions SET status = 'finished', ended_at = ? WHERE id = ? AND status = 'in_progress'",
          [now().toISOString(), sessionId],
        );
        await tx.execute(
          'DELETE FROM active_workout_state WHERE session_id = ?',
          [sessionId],
        );
        return 'finished' as const;
      });
    },

    async discard(sessionId) {
      await write(async tx => {
        // Sets, exercises and state go with it (ON DELETE CASCADE).
        await tx.execute(
          "DELETE FROM workout_sessions WHERE id = ? AND status = 'in_progress'",
          [sessionId],
        );
      });
    },

    async getPreviousPerformance(
      exerciseId,
      weightConvention,
      excludeSessionId,
    ) {
      const latest = await db.execute(
        `SELECT s.id, s.training_local_date
         FROM workout_sessions s
         JOIN session_exercises se ON se.session_id = s.id
         JOIN workout_sets ws ON ws.session_exercise_id = se.id
         WHERE s.status = 'finished' AND s.id != ? AND se.exercise_id = ?
           AND se.weight_convention_snapshot = ? AND ws.completed_at IS NOT NULL AND ws.type = 'work'
         ORDER BY s.ended_at DESC
         LIMIT 1`,
        [excludeSessionId, exerciseId, weightConvention],
      );
      if (latest.rows.length === 0) {
        return null;
      }
      const sessionId = String(latest.rows[0].id);
      const sets = await db.execute(
        `SELECT ws.weight_kg, ws.reps, ws.duration_seconds
         FROM workout_sets ws JOIN session_exercises se ON se.id = ws.session_exercise_id
         WHERE se.session_id = ? AND se.exercise_id = ? AND se.weight_convention_snapshot = ?
           AND ws.completed_at IS NOT NULL AND ws.type = 'work'
         ORDER BY se.position, ws.position`,
        [sessionId, exerciseId, weightConvention],
      );
      return {
        sessionId,
        trainingLocalDate: String(latest.rows[0].training_local_date),
        sets: sets.rows.map(row => ({
          weightKg: nullableNumber(row.weight_kg),
          reps: nullableNumber(row.reps),
          durationSeconds: nullableNumber(row.duration_seconds),
        })),
      };
    },
  };
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function rowToSet(row: Row): WorkoutSet {
  return {
    id: String(row.id),
    sessionExerciseId: String(row.session_exercise_id),
    position: Number(row.position),
    type: String(row.type) as WorkoutSet['type'],
    weightKg: nullableNumber(row.weight_kg),
    reps: nullableNumber(row.reps),
    durationSeconds: nullableNumber(row.duration_seconds),
    completedAt: nullableString(row.completed_at),
  };
}

function rowToSession(row: Row): WorkoutSession {
  return {
    id: String(row.id),
    routineId: nullableString(row.routine_id),
    routineName: nullableString(row.routine_name_snapshot),
    status: String(row.status) as WorkoutSession['status'],
    startedAt: String(row.started_at),
    endedAt: nullableString(row.ended_at),
    trainingLocalDate: String(row.training_local_date),
    timezone: String(row.timezone),
    pausedDurationMs: Number(row.paused_duration_ms),
    notes: String(row.notes),
  };
}

function rowToSessionExercise(row: Row): Omit<SessionExercise, 'sets'> {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    exerciseId: String(row.exercise_id),
    position: Number(row.position),
    name: String(row.name_snapshot),
    trackingType: String(row.tracking_type_snapshot) as TrackingType,
    weightConvention: String(
      row.weight_convention_snapshot,
    ) as WeightConvention,
    targetSets: nullableNumber(row.target_sets),
    targetReps: nullableNumber(row.target_reps),
    targetDurationSeconds: nullableNumber(row.target_duration_seconds),
    restSeconds: Number(row.rest_seconds),
  };
}

function rowToRest(row: Row): RestTimer {
  const endsAt = nullableString(row.rest_ends_at);
  return {
    endsAt: endsAt === null ? null : Date.parse(endsAt),
    pausedRemainingMs: nullableNumber(row.rest_paused_remaining_ms),
    durationMs: nullableNumber(row.rest_duration_ms),
  };
}
