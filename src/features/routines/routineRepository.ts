import type { Row, SqlExecutor, Database } from '../../db/types';
import { createId } from '../../lib/id';
import type { TrackingType } from '../exercises/types';
import { checkRoutineName, checkTargets, defaultTargets } from './rules';
import type {
  Routine,
  RoutineExercise,
  RoutineSummary,
  RoutineTargets,
  RoutineWithExercises,
} from './types';

export type RoutineRepository = {
  list(): Promise<RoutineSummary[]>;
  get(id: string): Promise<RoutineWithExercises | null>;
  create(name: string): Promise<Routine>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Appends the exercise with sensible default targets. */
  addExercise(routineId: string, exerciseId: string): Promise<RoutineExercise>;
  updateTargets(
    routineExerciseId: string,
    targets: RoutineTargets,
  ): Promise<void>;
  removeExercise(routineExerciseId: string): Promise<void>;
  moveExercise(
    routineExerciseId: string,
    direction: 'up' | 'down',
  ): Promise<void>;
};

/** Thrown for input the user can fix; the message is safe to show. */
export class RoutineInputError extends Error {}

type Options = {
  now?: () => Date;
  /** Called after every successful write so screens can refresh. */
  onChange?: () => void;
};

export function createRoutineRepository(
  db: Database,
  { now = () => new Date(), onChange = () => {} }: Options = {},
): RoutineRepository {
  const timestamp = () => now().toISOString();

  async function write<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const result = await db.transaction(work);
    onChange();
    return result;
  }

  async function touch(tx: SqlExecutor, routineId: string) {
    await tx.execute('UPDATE routines SET updated_at = ? WHERE id = ?', [
      timestamp(),
      routineId,
    ]);
  }

  async function requireRoutine(tx: SqlExecutor, routineId: string) {
    const { rows } = await tx.execute('SELECT id FROM routines WHERE id = ?', [
      routineId,
    ]);
    if (rows.length === 0) {
      throw new RoutineInputError('That routine no longer exists.');
    }
  }

  /** Rewrites positions as 0, 1, 2... in the current order. */
  async function renumber(tx: SqlExecutor, routineId: string) {
    const { rows } = await tx.execute(
      'SELECT id FROM routine_exercises WHERE routine_id = ? ORDER BY position, rowid',
      [routineId],
    );
    for (let index = 0; index < rows.length; index++) {
      await tx.execute(
        'UPDATE routine_exercises SET position = ? WHERE id = ?',
        [index, String(rows[index].id)],
      );
    }
  }

  async function findRoutineExercise(tx: SqlExecutor, id: string) {
    const { rows } = await tx.execute(
      `SELECT re.routine_id, re.position, e.tracking_type
       FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
       WHERE re.id = ?`,
      [id],
    );
    if (rows.length === 0) {
      throw new RoutineInputError('That exercise is no longer in the routine.');
    }
    return {
      routineId: String(rows[0].routine_id),
      position: Number(rows[0].position),
      trackingType: String(rows[0].tracking_type) as TrackingType,
    };
  }

  return {
    async list() {
      const { rows } = await db.execute(
        `SELECT r.*, COUNT(re.id) AS exercise_count
         FROM routines r LEFT JOIN routine_exercises re ON re.routine_id = r.id
         GROUP BY r.id
         ORDER BY r.updated_at DESC, r.name COLLATE NOCASE`,
      );
      return rows.map(row => ({
        ...rowToRoutine(row),
        exerciseCount: Number(row.exercise_count),
      }));
    },

    async get(id) {
      const { rows } = await db.execute('SELECT * FROM routines WHERE id = ?', [
        id,
      ]);
      if (rows.length === 0) {
        return null;
      }
      const exercises = await db.execute(
        `SELECT re.*, e.name AS exercise_name, e.tracking_type, e.weight_convention
         FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
         WHERE re.routine_id = ?
         ORDER BY re.position`,
        [id],
      );
      return {
        ...rowToRoutine(rows[0]),
        exercises: exercises.rows.map(rowToRoutineExercise),
      };
    },

    async create(rawName) {
      const checked = checkRoutineName(rawName);
      if (!checked.ok) {
        throw new RoutineInputError(checked.error);
      }
      const at = timestamp();
      const routine: Routine = {
        id: createId(),
        name: checked.name,
        createdAt: at,
        updatedAt: at,
      };
      await write(tx =>
        tx.execute(
          'INSERT INTO routines (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [routine.id, routine.name, routine.createdAt, routine.updatedAt],
        ),
      );
      return routine;
    },

    async rename(id, rawName) {
      const checked = checkRoutineName(rawName);
      if (!checked.ok) {
        throw new RoutineInputError(checked.error);
      }
      await write(async tx => {
        await requireRoutine(tx, id);
        await tx.execute(
          'UPDATE routines SET name = ?, updated_at = ? WHERE id = ?',
          [checked.name, timestamp(), id],
        );
      });
    },

    async remove(id) {
      // routine_exercises go with it (ON DELETE CASCADE).
      await write(tx => tx.execute('DELETE FROM routines WHERE id = ?', [id]));
    },

    async addExercise(routineId, exerciseId) {
      return write(async tx => {
        await requireRoutine(tx, routineId);
        const exercise = await tx.execute(
          'SELECT name, tracking_type, weight_convention FROM exercises WHERE id = ?',
          [exerciseId],
        );
        if (exercise.rows.length === 0) {
          throw new RoutineInputError('That exercise isn’t in the library.');
        }
        const trackingType = String(
          exercise.rows[0].tracking_type,
        ) as TrackingType;
        // New exercises get the rest time chosen in Profile → Default rest.
        const settings = await tx.execute(
          'SELECT default_rest_seconds FROM settings WHERE id = 1',
        );
        const restSeconds =
          settings.rows.length > 0
            ? Number(settings.rows[0].default_rest_seconds)
            : undefined;
        const { rows } = await tx.execute(
          'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM routine_exercises WHERE routine_id = ?',
          [routineId],
        );
        const added: RoutineExercise = {
          id: createId(),
          routineId,
          exerciseId,
          position: Number(rows[0].next),
          exerciseName: String(exercise.rows[0].name),
          trackingType,
          weightConvention: String(
            exercise.rows[0].weight_convention,
          ) as RoutineExercise['weightConvention'],
          ...defaultTargets(trackingType, restSeconds),
        };
        await tx.execute(
          `INSERT INTO routine_exercises (
             id, routine_id, exercise_id, position, target_sets, target_reps,
             target_duration_seconds, rest_seconds
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            added.id,
            routineId,
            exerciseId,
            added.position,
            added.targetSets,
            added.targetReps,
            added.targetDurationSeconds,
            added.restSeconds,
          ],
        );
        await touch(tx, routineId);
        return added;
      });
    },

    async updateTargets(routineExerciseId, targets) {
      await write(async tx => {
        const found = await findRoutineExercise(tx, routineExerciseId);
        const problems = checkTargets(targets, found.trackingType);
        if (problems.length > 0) {
          throw new RoutineInputError(problems.join(' '));
        }
        await tx.execute(
          `UPDATE routine_exercises
           SET target_sets = ?, target_reps = ?, target_duration_seconds = ?, rest_seconds = ?
           WHERE id = ?`,
          [
            targets.targetSets,
            targets.targetReps,
            targets.targetDurationSeconds,
            targets.restSeconds,
            routineExerciseId,
          ],
        );
        await touch(tx, found.routineId);
      });
    },

    async removeExercise(routineExerciseId) {
      await write(async tx => {
        const found = await findRoutineExercise(tx, routineExerciseId);
        await tx.execute('DELETE FROM routine_exercises WHERE id = ?', [
          routineExerciseId,
        ]);
        await renumber(tx, found.routineId);
        await touch(tx, found.routineId);
      });
    },

    async moveExercise(routineExerciseId, direction) {
      await write(async tx => {
        const found = await findRoutineExercise(tx, routineExerciseId);
        await renumber(tx, found.routineId);
        const { rows } = await tx.execute(
          'SELECT id, position FROM routine_exercises WHERE routine_id = ? ORDER BY position',
          [found.routineId],
        );
        const index = rows.findIndex(
          row => String(row.id) === routineExerciseId,
        );
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || swapWith < 0 || swapWith >= rows.length) {
          return; // Already at the top/bottom.
        }
        await tx.execute(
          'UPDATE routine_exercises SET position = ? WHERE id = ?',
          [swapWith, routineExerciseId],
        );
        await tx.execute(
          'UPDATE routine_exercises SET position = ? WHERE id = ?',
          [index, String(rows[swapWith].id)],
        );
        await touch(tx, found.routineId);
      });
    },
  };
}

function rowToRoutine(row: Row): Routine {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function rowToRoutineExercise(row: Row): RoutineExercise {
  return {
    id: String(row.id),
    routineId: String(row.routine_id),
    exerciseId: String(row.exercise_id),
    position: Number(row.position),
    exerciseName: String(row.exercise_name),
    trackingType: String(row.tracking_type) as RoutineExercise['trackingType'],
    weightConvention: String(
      row.weight_convention,
    ) as RoutineExercise['weightConvention'],
    targetSets: Number(row.target_sets),
    targetReps: nullableNumber(row.target_reps),
    targetDurationSeconds: nullableNumber(row.target_duration_seconds),
    restSeconds: Number(row.rest_seconds),
  };
}
