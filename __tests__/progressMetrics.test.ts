import { countTicks, niceTicks } from '../src/components/charts/niceTicks';
import {
  bestLifts,
  bestPerSession,
  periodStats,
  workoutsPerBucket,
  type HistoryEntry,
  type LiftSet,
} from '../src/features/progress/metrics';
import {
  bucketsFor,
  inRange,
  periodFor,
} from '../src/features/progress/periods';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

function entry(date: string, minutes = 60, id = date): HistoryEntry {
  const start = Date.parse(`${date}T10:00:00Z`);
  return {
    sessionId: id,
    routineName: 'Test',
    trainingLocalDate: date,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + minutes * 60_000).toISOString(),
    pausedDurationMs: 0,
    completedWorkSets: 3,
  };
}

describe('periods', () => {
  test('weeks run Monday to Sunday and move by whole weeks', () => {
    expect(periodFor('week', day(2026, 9, 26), 0)).toMatchObject({
      start: '2026-09-21',
      end: '2026-09-27',
      label: 'This week',
    });
    expect(periodFor('week', day(2026, 9, 26), -1)).toMatchObject({
      start: '2026-09-14',
      end: '2026-09-20',
      label: 'Last week',
    });
  });

  test('months cover the whole calendar month, including year ends', () => {
    expect(periodFor('month', day(2026, 9, 26), 0)).toMatchObject({
      start: '2026-09-01',
      end: '2026-09-30',
    });
    expect(periodFor('month', day(2026, 1, 15), -1)).toMatchObject({
      start: '2025-12-01',
      end: '2025-12-31',
    });
    expect(periodFor('month', day(2028, 2, 10), 0).end).toBe('2028-02-29'); // leap year
  });

  test('a month is split into Monday-start weeks that cover every day once', () => {
    const buckets = bucketsFor(periodFor('month', day(2026, 9, 26), 0));
    expect(buckets.map(b => [b.start, b.end])).toEqual([
      ['2026-09-01', '2026-09-06'],
      ['2026-09-07', '2026-09-13'],
      ['2026-09-14', '2026-09-20'],
      ['2026-09-21', '2026-09-27'],
      ['2026-09-28', '2026-09-30'],
    ]);
    expect(bucketsFor(periodFor('week', day(2026, 9, 26), 0))).toHaveLength(7);
  });

  test('inRange compares local dates, inclusive', () => {
    const month = { start: '2026-09-01', end: '2026-09-30' };
    expect(inRange('2026-09-30', month)).toBe(true);
    expect(inRange('2026-10-01', month)).toBe(false);
    expect(inRange('2026-08-31', month)).toBe(false);
  });
});

describe('workout stats', () => {
  test('count workouts, distinct days and time in the period only', () => {
    const entries = [
      entry('2026-09-21', 60, 'a'),
      entry('2026-09-21', 30, 'b'), // second workout, same day
      entry('2026-09-27', 45, 'c'),
      entry('2026-09-28', 50, 'd'), // next week
    ];
    const week = periodFor('week', day(2026, 9, 26), 0);
    expect(periodStats(entries, week)).toEqual({
      workouts: 3,
      activeDays: 2,
      totalDurationMs: 135 * 60_000,
    });
    expect(workoutsPerBucket(entries, bucketsFor(week))).toEqual([
      2, 0, 0, 0, 0, 0, 1,
    ]);
  });

  test('a late workout on the last day of a month stays in that month', () => {
    // Started 23:30 on 30 September (local); it finishes after midnight but
    // belongs to its stored training date.
    const late = { ...entry('2026-09-30'), endedAt: '2026-10-01T00:40:00Z' };
    expect(
      periodStats([late], periodFor('month', day(2026, 9, 26), 0)).workouts,
    ).toBe(1);
    expect(
      periodStats([late], periodFor('month', day(2026, 10, 5), 0)).workouts,
    ).toBe(0);
  });

  test('no workouts means zeros, not sample numbers', () => {
    expect(periodStats([], periodFor('week', day(2026, 9, 26), 0))).toEqual({
      workouts: 0,
      activeDays: 0,
      totalDurationMs: 0,
    });
  });
});

describe('best lifts', () => {
  const lift = (over: Partial<LiftSet>): LiftSet => ({
    sessionId: 's1',
    exerciseId: 'dumbbell-curl',
    exerciseName: 'Dumbbell Curl',
    weightConvention: 'per_dumbbell',
    weightKg: 10,
    reps: 10,
    trainingLocalDate: '2026-09-01',
    ...over,
  });

  test('heaviest wins; equal weight → more reps; still equal → the first time', () => {
    const sets = [
      lift({
        weightKg: 12,
        reps: 8,
        trainingLocalDate: '2026-09-05',
        sessionId: 'a',
      }),
      lift({
        weightKg: 12,
        reps: 10,
        trainingLocalDate: '2026-09-10',
        sessionId: 'b',
      }),
      lift({
        weightKg: 12,
        reps: 10,
        trainingLocalDate: '2026-09-20',
        sessionId: 'c',
      }),
      lift({
        weightKg: 11,
        reps: 15,
        trainingLocalDate: '2026-09-25',
        sessionId: 'd',
      }),
    ];
    expect(bestLifts(sets)).toEqual([
      expect.objectContaining({
        weightKg: 12,
        reps: 10,
        trainingLocalDate: '2026-09-10',
      }),
    ]);
  });

  test('different load conventions are never compared', () => {
    const sets = [
      lift({
        exerciseId: 'goblet-squat',
        exerciseName: 'Goblet Squat',
        weightKg: 30,
      }),
      lift({
        exerciseId: 'goblet-squat',
        exerciseName: 'Goblet Squat',
        weightConvention: 'total_with_bar',
        weightKg: 60,
      }),
    ];
    expect(bestLifts(sets).map(b => [b.weightConvention, b.weightKg])).toEqual([
      ['per_dumbbell', 30],
      ['total_with_bar', 60],
    ]);
  });

  test('trend: one best set per session, oldest first', () => {
    const sets = [
      lift({
        sessionId: 'late',
        trainingLocalDate: '2026-09-20',
        weightKg: 14,
      }),
      lift({
        sessionId: 'early',
        trainingLocalDate: '2026-09-01',
        weightKg: 10,
      }),
      lift({
        sessionId: 'early',
        trainingLocalDate: '2026-09-01',
        weightKg: 12,
      }),
    ];
    expect(bestPerSession(sets).map(s => [s.sessionId, s.weightKg])).toEqual([
      ['early', 12],
      ['late', 14],
    ]);
  });
});

describe('axis ticks', () => {
  test('round, evenly spaced steps that cover the data', () => {
    expect(niceTicks(10, 42)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(12.5, 15)).toEqual([12, 13, 14, 15]);
    expect(niceTicks(40, 45)).toEqual([40, 42, 44, 46]);
    for (const [lo, hi] of [
      [7.5, 8],
      [0, 137],
      [20, 20],
    ]) {
      const ticks = niceTicks(lo, hi);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks[0]).toBeLessThanOrEqual(lo);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(hi);
    }
  });

  test('counts use whole numbers starting at zero', () => {
    expect(countTicks(0)).toEqual([0, 1]);
    expect(countTicks(3)).toEqual([0, 1, 2, 3]);
    expect(countTicks(9).every(Number.isInteger)).toBe(true);
    expect(countTicks(9)[0]).toBe(0);
    expect(countTicks(9)[countTicks(9).length - 1]).toBeGreaterThanOrEqual(9);
  });
});
