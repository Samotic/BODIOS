import type { SessionDetail, SessionExercise, WorkoutSet } from './types';

export type WorkoutSummary = {
  durationMs: number;
  completedSetCount: number;
  exercises: Array<Omit<SessionExercise, 'sets'> & { sets: WorkoutSet[] }>;
};

/**
 * Built only from sets marked done: no estimates, no calories. Exercises
 * with no completed sets are left out.
 */
export function summarize(
  detail: SessionDetail,
  now: Date = new Date(),
): WorkoutSummary {
  const end = detail.endedAt ? Date.parse(detail.endedAt) : now.getTime();
  const durationMs = Math.max(
    0,
    end - Date.parse(detail.startedAt) - detail.pausedDurationMs,
  );

  const exercises = detail.exercises
    .map(exercise => ({
      ...exercise,
      sets: exercise.sets.filter(set => set.completedAt !== null),
    }))
    .filter(exercise => exercise.sets.length > 0);

  return {
    durationMs,
    completedSetCount: exercises.reduce((n, e) => n + e.sets.length, 0),
    exercises,
  };
}
