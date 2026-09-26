import type { TrackingType } from '../exercises/types';
import type { RoutineTargets } from './types';

/** Allowed ranges; the database enforces the same limits. */
export const limits = {
  nameLength: 60,
  sets: { min: 1, max: 20, step: 1 },
  reps: { min: 1, max: 100, step: 1 },
  durationSeconds: { min: 5, max: 3600, step: 5 },
  restSeconds: { min: 0, max: 600, step: 15 },
} as const;

export const DEFAULT_REST_SECONDS = 90;

export function defaultTargets(
  trackingType: TrackingType,
  restSeconds: number = DEFAULT_REST_SECONDS,
): RoutineTargets {
  return trackingType === 'duration'
    ? {
        targetSets: 3,
        targetReps: null,
        targetDurationSeconds: 30,
        restSeconds,
      }
    : {
        targetSets: 3,
        targetReps: 10,
        targetDurationSeconds: null,
        restSeconds,
      };
}

/** Trims and checks a routine name. Returns the cleaned name or an error. */
export function checkRoutineName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0) {
    return { ok: false, error: 'Give the routine a name.' };
  }
  if (name.length > limits.nameLength) {
    return {
      ok: false,
      error: `Keep the name to ${limits.nameLength} characters or fewer.`,
    };
  }
  return { ok: true, name };
}

function inRange(
  value: number | null,
  range: { min: number; max: number },
): boolean {
  return (
    value !== null &&
    Number.isInteger(value) &&
    value >= range.min &&
    value <= range.max
  );
}

/** Problems with a set of targets for an exercise of the given type, if any. */
export function checkTargets(
  targets: RoutineTargets,
  trackingType: TrackingType,
): string[] {
  const problems: string[] = [];
  if (!inRange(targets.targetSets, limits.sets)) {
    problems.push(
      `Sets must be a whole number from ${limits.sets.min} to ${limits.sets.max}.`,
    );
  }
  if (trackingType === 'duration') {
    if (!inRange(targets.targetDurationSeconds, limits.durationSeconds)) {
      problems.push('Time must be between 5 seconds and 60 minutes.');
    }
    if (targets.targetReps !== null) {
      problems.push('Timed exercises use time, not reps.');
    }
  } else {
    if (!inRange(targets.targetReps, limits.reps)) {
      problems.push(
        `Reps must be a whole number from ${limits.reps.min} to ${limits.reps.max}.`,
      );
    }
    if (targets.targetDurationSeconds !== null) {
      problems.push('Rep-based exercises use reps, not time.');
    }
  }
  if (!inRange(targets.restSeconds, limits.restSeconds)) {
    problems.push('Rest must be between 0 and 10 minutes.');
  }
  return problems;
}

/** A routine can only be started once it has at least one exercise. */
export function canStartRoutine(routine: { exercises: unknown[] }): boolean {
  return routine.exercises.length > 0;
}

/** "90 s", "2 min", "2 min 30 s" */
export function formatSeconds(total: number): string {
  if (total < 60) {
    return `${total} s`;
  }
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}
