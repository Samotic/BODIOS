import type { Database, Row } from '../../db/types';
import type { WeightConvention } from '../exercises/types';
import type { HistoryEntry, LiftSet } from './metrics';

export const EXPORT_FORMAT = 'bodios-export';
export const EXPORT_VERSION = 1;

export type HistoryRepository = {
  /** Finished workouts (with at least one completed working set), newest first. */
  listWorkouts(): Promise<HistoryEntry[]>;
  /** Completed working sets that have a weight, for best lifts and trends. */
  liftSets(filter?: {
    exerciseId: string;
    weightConvention: WeightConvention;
  }): Promise<LiftSet[]>;
  /** Deletes a finished workout and its sets. In-progress ones use discard. */
  deleteWorkout(sessionId: string): Promise<void>;
  /** Everything the user has entered, as plain data for export. */
  exportData(now?: Date): Promise<BodiosExport>;
  /** Deletes routines, workouts and settings. The exercise catalogue stays. */
  resetAll(): Promise<void>;
};

export type BodiosExport = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  weightsIn: 'kg';
  settings: Record<string, unknown>;
  routines: Array<Record<string, unknown>>;
  workouts: Array<Record<string, unknown>>;
};

export function createHistoryRepository(
  db: Database,
  { onChange = () => {} }: { onChange?: () => void } = {},
): HistoryRepository {
  return {
    async listWorkouts() {
      const { rows } = await db.execute(
        `SELECT s.id, s.routine_name_snapshot, s.training_local_date, s.started_at, s.ended_at,
                s.paused_duration_ms, COUNT(ws.id) AS completed_work_sets
         FROM workout_sessions s
         JOIN session_exercises se ON se.session_id = s.id
         JOIN workout_sets ws ON ws.session_exercise_id = se.id
         WHERE s.status = 'finished' AND ws.completed_at IS NOT NULL AND ws.type = 'work'
         GROUP BY s.id
         ORDER BY s.started_at DESC`,
      );
      return rows.map(rowToEntry);
    },

    async liftSets(filter) {
      const where = filter
        ? 'AND se.exercise_id = ? AND se.weight_convention_snapshot = ?'
        : '';
      const { rows } = await db.execute(
        `SELECT s.id AS session_id, se.exercise_id, e.name AS exercise_name,
                se.weight_convention_snapshot, ws.weight_kg, ws.reps, s.training_local_date
         FROM workout_sets ws
         JOIN session_exercises se ON se.id = ws.session_exercise_id
         JOIN workout_sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         WHERE s.status = 'finished' AND ws.completed_at IS NOT NULL AND ws.type = 'work'
           AND se.tracking_type_snapshot = 'weight_reps' AND ws.weight_kg IS NOT NULL
           AND ws.reps IS NOT NULL ${where}
         ORDER BY s.training_local_date, s.started_at`,
        filter ? [filter.exerciseId, filter.weightConvention] : [],
      );
      return rows.map(row => ({
        sessionId: String(row.session_id),
        exerciseId: String(row.exercise_id),
        exerciseName: String(row.exercise_name),
        weightConvention: String(
          row.weight_convention_snapshot,
        ) as WeightConvention,
        weightKg: Number(row.weight_kg),
        reps: Number(row.reps),
        trainingLocalDate: String(row.training_local_date),
      }));
    },

    async deleteWorkout(sessionId) {
      await db.transaction(tx =>
        tx.execute(
          "DELETE FROM workout_sessions WHERE id = ? AND status = 'finished'",
          [sessionId],
        ),
      );
      onChange();
    },

    async exportData(now = new Date()) {
      const settings = await db.execute('SELECT * FROM settings WHERE id = 1');
      const routines = await db.execute(
        'SELECT * FROM routines ORDER BY created_at',
      );
      const routineExercises = await db.execute(
        `SELECT re.*, e.name AS exercise_name FROM routine_exercises re
         JOIN exercises e ON e.id = re.exercise_id ORDER BY re.routine_id, re.position`,
      );
      const sessions = await db.execute(
        "SELECT * FROM workout_sessions WHERE status = 'finished' ORDER BY started_at",
      );
      const sessionExercises = await db.execute(
        `SELECT se.* FROM session_exercises se
         JOIN workout_sessions s ON s.id = se.session_id
         WHERE s.status = 'finished' ORDER BY se.session_id, se.position`,
      );
      const sets = await db.execute(
        `SELECT ws.* FROM workout_sets ws
         JOIN session_exercises se ON se.id = ws.session_exercise_id
         JOIN workout_sessions s ON s.id = se.session_id
         WHERE s.status = 'finished' ORDER BY ws.session_exercise_id, ws.position`,
      );

      const setsByExercise = groupBy(sets.rows, row =>
        String(row.session_exercise_id),
      );
      const exercisesBySession = groupBy(sessionExercises.rows, row =>
        String(row.session_id),
      );
      const itemsByRoutine = groupBy(routineExercises.rows, row =>
        String(row.routine_id),
      );
      const s = settings.rows[0];

      return {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: now.toISOString(),
        weightsIn: 'kg',
        settings: s
          ? {
              preferredUnit: s.preferred_unit,
              defaultRestSeconds: s.default_rest_seconds,
              demoStartMuted: Number(s.demo_start_muted) === 1,
            }
          : {},
        routines: routines.rows.map(r => ({
          id: r.id,
          name: r.name,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          exercises: (itemsByRoutine.get(String(r.id)) ?? []).map(item => ({
            exerciseId: item.exercise_id,
            exerciseName: item.exercise_name,
            targetSets: item.target_sets,
            targetReps: item.target_reps,
            targetDurationSeconds: item.target_duration_seconds,
            restSeconds: item.rest_seconds,
          })),
        })),
        workouts: sessions.rows.map(session => ({
          id: session.id,
          routineName: session.routine_name_snapshot,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          trainingLocalDate: session.training_local_date,
          timezone: session.timezone,
          notes: session.notes,
          exercises: (exercisesBySession.get(String(session.id)) ?? []).map(
            exercise => ({
              exerciseId: exercise.exercise_id,
              name: exercise.name_snapshot,
              trackingType: exercise.tracking_type_snapshot,
              weightConvention: exercise.weight_convention_snapshot,
              sets: (setsByExercise.get(String(exercise.id)) ?? []).map(
                set => ({
                  type: set.type,
                  weightKg: set.weight_kg,
                  reps: set.reps,
                  durationSeconds: set.duration_seconds,
                  completedAt: set.completed_at,
                }),
              ),
            }),
          ),
        })),
      };
    },

    async resetAll() {
      await db.transaction(async tx => {
        // Sessions take their exercises, sets and state with them (CASCADE).
        await tx.execute('DELETE FROM workout_sessions');
        await tx.execute('DELETE FROM routines');
        await tx.execute(
          'UPDATE settings SET preferred_unit = ?, default_rest_seconds = ?, demo_start_muted = ? WHERE id = 1',
          ['kg', 90, 1],
        );
      });
      onChange();
    },
  };
}

function groupBy(rows: Row[], key: (row: Row) => string): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

function rowToEntry(row: Row): HistoryEntry {
  return {
    sessionId: String(row.id),
    routineName:
      row.routine_name_snapshot == null
        ? null
        : String(row.routine_name_snapshot),
    trainingLocalDate: String(row.training_local_date),
    startedAt: String(row.started_at),
    endedAt: String(row.ended_at),
    pausedDurationMs: Number(row.paused_duration_ms),
    completedWorkSets: Number(row.completed_work_sets),
  };
}
