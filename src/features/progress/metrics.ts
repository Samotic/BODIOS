import type { WeightConvention } from '../exercises/types';
import { inRange, type Bucket } from './periods';

/**
 * A finished session that counts as a workout: it has at least one
 * completed working set (the roadmap's definition).
 */
export type HistoryEntry = {
  sessionId: string;
  routineName: string | null;
  trainingLocalDate: string;
  startedAt: string;
  endedAt: string;
  pausedDurationMs: number;
  completedWorkSets: number;
};

/** One completed working set with a weight, for best-lift maths. */
export type LiftSet = {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  weightConvention: WeightConvention;
  weightKg: number;
  reps: number;
  trainingLocalDate: string;
};

export function durationOf(entry: HistoryEntry): number {
  return Math.max(
    0,
    Date.parse(entry.endedAt) -
      Date.parse(entry.startedAt) -
      entry.pausedDurationMs,
  );
}

export type PeriodStats = {
  workouts: number;
  /** Distinct training days (a session crossing midnight counts once, on its start day). */
  activeDays: number;
  totalDurationMs: number;
};

export function periodStats(
  entries: HistoryEntry[],
  range: { start: string; end: string },
): PeriodStats {
  const inPeriod = entries.filter(e => inRange(e.trainingLocalDate, range));
  return {
    workouts: inPeriod.length,
    activeDays: new Set(inPeriod.map(e => e.trainingLocalDate)).size,
    totalDurationMs: inPeriod.reduce((sum, e) => sum + durationOf(e), 0),
  };
}

export function workoutsPerBucket(
  entries: HistoryEntry[],
  buckets: Bucket[],
): number[] {
  return buckets.map(
    bucket => entries.filter(e => inRange(e.trainingLocalDate, bucket)).length,
  );
}

/** Heavier wins; at equal weight more reps wins; still equal, the first time counts. */
function better(a: LiftSet, b: LiftSet): boolean {
  if (a.weightKg !== b.weightKg) {
    return a.weightKg > b.weightKg;
  }
  if (a.reps !== b.reps) {
    return a.reps > b.reps;
  }
  return a.trainingLocalDate < b.trainingLocalDate;
}

/**
 * Best logged weight per exercise *and* load convention (a dumbbell weight
 * is never compared with a barbell total). This is the heaviest completed
 * working set actually logged, not an estimated one-rep max.
 */
export function bestLifts(sets: LiftSet[]): LiftSet[] {
  const best = new Map<string, LiftSet>();
  for (const set of sets) {
    const key = `${set.exerciseId}|${set.weightConvention}`;
    const current = best.get(key);
    if (!current || better(set, current)) {
      best.set(key, set);
    }
  }
  return [...best.values()].sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName),
  );
}

/** The best set of each session, oldest first: the per-exercise trend. */
export function bestPerSession(sets: LiftSet[]): LiftSet[] {
  const bySession = new Map<string, LiftSet>();
  for (const set of sets) {
    const current = bySession.get(set.sessionId);
    if (!current || better(set, current)) {
      bySession.set(set.sessionId, set);
    }
  }
  return [...bySession.values()].sort((a, b) =>
    a.trainingLocalDate === b.trainingLocalDate
      ? a.sessionId.localeCompare(b.sessionId)
      : a.trainingLocalDate < b.trainingLocalDate
      ? -1
      : 1,
  );
}
