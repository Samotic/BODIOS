import { formatClock } from '../../lib/dates';
import type { TrackingType, WeightConvention } from '../exercises/types';
import { formatWeight, unitToKg, type WeightUnit } from '../settings/units';
import type { WorkoutSet } from './types';

export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 1000;
export const MAX_DURATION_SECONDS = 86400;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * The weight field. Blank means "not entered yet". Accepts "12.5" and
 * "12,5". Zero is allowed (bodyweight / unweighted).
 */
export function parseWeightInput(
  text: string,
  unit: WeightUnit,
): Parsed<number | null> {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') {
    return { ok: true, value: null };
  }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
    return { ok: false, error: 'Enter a number, like 12.5' };
  }
  const kg = unitToKg(Number(trimmed), unit);
  if (kg > MAX_WEIGHT_KG) {
    return { ok: false, error: 'That weight looks too high.' };
  }
  // Keep grams; more precision than that is noise from unit conversion.
  return { ok: true, value: Math.round(kg * 1000) / 1000 };
}

export function parseRepsInput(text: string): Parsed<number | null> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: 'Reps are whole numbers.' };
  }
  const reps = Number(trimmed);
  if (reps > MAX_REPS) {
    return { ok: false, error: 'That’s a lot of reps. Check the number.' };
  }
  return { ok: true, value: reps };
}

/** Seconds, as "45" or "1:30". */
export function parseDurationInput(text: string): Parsed<number | null> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: true, value: null };
  }
  const clock = /^(\d+):([0-5]\d)$/.exec(trimmed);
  const seconds = clock
    ? Number(clock[1]) * 60 + Number(clock[2])
    : /^\d+$/.test(trimmed)
    ? Number(trimmed)
    : NaN;
  if (Number.isNaN(seconds)) {
    return {
      ok: false,
      error: 'Enter seconds (45) or minutes:seconds (1:30).',
    };
  }
  if (seconds > MAX_DURATION_SECONDS) {
    return { ok: false, error: 'That time looks too long.' };
  }
  return { ok: true, value: seconds };
}

/**
 * What still has to be filled in before a set can be marked done, or null
 * if it's ready. Reps must be at least 1; weight may be 0; for "added
 * weight" exercises (pull-ups) a blank weight means bodyweight only.
 */
export function missingForCompletion(
  set: Pick<WorkoutSet, 'weightKg' | 'reps' | 'durationSeconds'>,
  trackingType: TrackingType,
  weightConvention: WeightConvention,
): string | null {
  if (trackingType === 'duration') {
    return set.durationSeconds && set.durationSeconds > 0
      ? null
      : 'Enter the time first.';
  }
  if (!set.reps || set.reps < 1) {
    return 'Enter reps first.';
  }
  if (
    trackingType === 'weight_reps' &&
    weightConvention !== 'added_load' &&
    set.weightKg === null
  ) {
    return 'Enter the weight first.';
  }
  return null;
}

/** "12.5 kg × 10", "Bodyweight × 8", "+10 kg × 6", "15 reps", "0:45" */
export function describeSet(
  set: Pick<WorkoutSet, 'weightKg' | 'reps' | 'durationSeconds'>,
  trackingType: TrackingType,
  weightConvention: WeightConvention,
  unit: WeightUnit,
): string {
  if (trackingType === 'duration') {
    return formatClock((set.durationSeconds ?? 0) * 1000);
  }
  const reps = set.reps ?? 0;
  if (trackingType === 'reps') {
    return reps === 1 ? '1 rep' : `${reps} reps`;
  }
  if (weightConvention === 'added_load') {
    return !set.weightKg
      ? `Bodyweight × ${reps}`
      : `+${formatWeight(set.weightKg, unit)} × ${reps}`;
  }
  return `${formatWeight(set.weightKg ?? 0, unit)} × ${reps}`;
}
