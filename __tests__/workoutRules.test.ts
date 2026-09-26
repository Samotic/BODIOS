import { formatClock, formatDuration, localDateString } from '../src/lib/dates';
import {
  formatWeight,
  kgToUnit,
  unitToKg,
} from '../src/features/settings/units';
import {
  adjustRest,
  isActive,
  noRest,
  pauseRest,
  remainingMs,
  resumeRest,
  startRest,
} from '../src/features/workouts/restTimer';
import {
  describeSet,
  missingForCompletion,
  parseDurationInput,
  parseRepsInput,
  parseWeightInput,
} from '../src/features/workouts/setRules';

describe('rest timer', () => {
  const t0 = 1_000_000;

  test('counts down from the stored end time, never below zero', () => {
    const timer = startRest(90_000, t0);
    expect(remainingMs(timer, t0)).toBe(90_000);
    expect(remainingMs(timer, t0 + 30_000)).toBe(60_000);
    // e.g. the phone was locked for ten minutes
    expect(remainingMs(timer, t0 + 600_000)).toBe(0);
    expect(remainingMs(noRest, t0)).toBeNull();
    expect(isActive(noRest)).toBe(false);
  });

  test('pausing freezes the remaining time until resumed', () => {
    const paused = pauseRest(startRest(90_000, t0), t0 + 10_000);
    expect(remainingMs(paused, t0 + 500_000)).toBe(80_000);
    const resumed = resumeRest(paused, t0 + 500_000);
    expect(remainingMs(resumed, t0 + 510_000)).toBe(70_000);
  });

  test('adjusting adds or removes time without going negative', () => {
    const timer = startRest(30_000, t0);
    expect(remainingMs(adjustRest(timer, 15_000, t0), t0)).toBe(45_000);
    expect(remainingMs(adjustRest(timer, -60_000, t0), t0)).toBe(0);
    const paused = pauseRest(timer, t0);
    expect(remainingMs(adjustRest(paused, -15_000, t0), t0)).toBe(15_000);
    expect(adjustRest(noRest, 15_000, t0)).toEqual(noRest);
  });
});

describe('set inputs', () => {
  test('weight: blank, decimals, commas, zero and nonsense', () => {
    expect(parseWeightInput('', 'kg')).toEqual({ ok: true, value: null });
    expect(parseWeightInput('12.5', 'kg')).toEqual({ ok: true, value: 12.5 });
    expect(parseWeightInput('12,5', 'kg')).toEqual({ ok: true, value: 12.5 });
    expect(parseWeightInput('12.', 'kg')).toEqual({ ok: true, value: 12 });
    expect(parseWeightInput('0', 'kg')).toEqual({ ok: true, value: 0 });
    expect(parseWeightInput('-5', 'kg').ok).toBe(false);
    expect(parseWeightInput('abc', 'kg').ok).toBe(false);
    expect(parseWeightInput('5000', 'kg').ok).toBe(false);
    // Typed in pounds, stored in kilograms.
    expect(parseWeightInput('45', 'lb')).toEqual({ ok: true, value: 20.412 });
  });

  test('reps: whole numbers only', () => {
    expect(parseRepsInput('10')).toEqual({ ok: true, value: 10 });
    expect(parseRepsInput('')).toEqual({ ok: true, value: null });
    expect(parseRepsInput('2.5').ok).toBe(false);
    expect(parseRepsInput('9999').ok).toBe(false);
  });

  test('time: seconds or minutes:seconds', () => {
    expect(parseDurationInput('45')).toEqual({ ok: true, value: 45 });
    expect(parseDurationInput('1:30')).toEqual({ ok: true, value: 90 });
    expect(parseDurationInput('1:75').ok).toBe(false);
    expect(parseDurationInput('abc').ok).toBe(false);
  });
});

describe('completing a set', () => {
  const blank = { weightKg: null, reps: null, durationSeconds: null };

  test('weight and reps exercises need both (zero weight is allowed)', () => {
    expect(missingForCompletion(blank, 'weight_reps', 'per_dumbbell')).toBe(
      'Enter reps first.',
    );
    expect(
      missingForCompletion(
        { ...blank, reps: 5 },
        'weight_reps',
        'per_dumbbell',
      ),
    ).toBe('Enter the weight first.');
    expect(
      missingForCompletion(
        { ...blank, reps: 5, weightKg: 0 },
        'weight_reps',
        'total_with_bar',
      ),
    ).toBeNull();
    expect(
      missingForCompletion(
        { ...blank, reps: 0, weightKg: 10 },
        'weight_reps',
        'machine',
      ),
    ).toBe('Enter reps first.');
  });

  test('added-weight, reps-only and timed exercises', () => {
    expect(
      missingForCompletion({ ...blank, reps: 8 }, 'weight_reps', 'added_load'),
    ).toBeNull();
    expect(
      missingForCompletion({ ...blank, reps: 12 }, 'reps', 'none'),
    ).toBeNull();
    expect(
      missingForCompletion({ ...blank, reps: 12 }, 'duration', 'none'),
    ).toBe('Enter the time first.');
    expect(
      missingForCompletion(
        { ...blank, durationSeconds: 40 },
        'duration',
        'none',
      ),
    ).toBeNull();
  });

  test('describeSet labels the load honestly', () => {
    expect(
      describeSet(
        { ...blank, weightKg: 12.5, reps: 10 },
        'weight_reps',
        'per_dumbbell',
        'kg',
      ),
    ).toBe('12.5 kg × 10');
    expect(
      describeSet({ ...blank, reps: 8 }, 'weight_reps', 'added_load', 'kg'),
    ).toBe('Bodyweight × 8');
    expect(
      describeSet(
        { ...blank, weightKg: 10, reps: 6 },
        'weight_reps',
        'added_load',
        'kg',
      ),
    ).toBe('+10 kg × 6');
    expect(describeSet({ ...blank, reps: 1 }, 'reps', 'none', 'kg')).toBe(
      '1 rep',
    );
    expect(
      describeSet({ ...blank, durationSeconds: 65 }, 'duration', 'none', 'kg'),
    ).toBe('1:05');
  });
});

describe('units and dates', () => {
  test('kg ⇄ lb round-trips', () => {
    expect(kgToUnit(20, 'kg')).toBe(20);
    expect(unitToKg(kgToUnit(20, 'lb'), 'lb')).toBeCloseTo(20, 10);
    expect(formatWeight(20, 'lb')).toBe('44.09 lb');
  });

  test('clock and duration formatting', () => {
    expect(formatClock(90_000)).toBe('1:30');
    expect(formatClock(1_500)).toBe('0:02'); // rounds up: never shows 0:00 early
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatDuration(30_000)).toBe('under a minute');
    expect(formatDuration(42 * 60_000)).toBe('42 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 5 min');
  });

  test('training day uses the local calendar date', () => {
    expect(localDateString(new Date(2026, 8, 26, 23, 59))).toBe('2026-09-26');
    expect(localDateString(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01');
  });
});
