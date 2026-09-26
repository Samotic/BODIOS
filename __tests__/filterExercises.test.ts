import { exerciseCatalogue } from '../src/data/exerciseCatalogue';
import {
  emptyFilter,
  filterExercises,
  isFilterActive,
} from '../src/features/exercises/filterExercises';

const ids = (filter: Partial<typeof emptyFilter>) =>
  filterExercises(exerciseCatalogue, { ...emptyFilter, ...filter }).map(
    e => e.id,
  );

describe('filterExercises', () => {
  test('no search and no filters shows everything', () => {
    expect(ids({})).toHaveLength(exerciseCatalogue.length);
    expect(ids({ query: '   ' })).toHaveLength(exerciseCatalogue.length);
  });

  test('search is case- and accent-insensitive and matches other names', () => {
    expect(ids({ query: 'HAMMER' })).toEqual(['hammer-curl']);
    expect(ids({ query: 'hámmer' })).toEqual(['hammer-curl']);
    expect(ids({ query: 'rdl' })).toEqual(['romanian-deadlift']);
  });

  test('exercises whose name contains the typed phrase come first', () => {
    // "press" + "up" also matches Incline Dumbbell Press ("Upper chest"),
    // but Push-Up ("Press-Up") is the exercise the user means.
    expect(ids({ query: 'press-up' })[0]).toBe('push-up');
    expect(ids({ query: 'press up' })[0]).toBe('push-up');
    expect(ids({ query: 'curl' })).toEqual(['dumbbell-curl', 'hammer-curl']);
  });

  test('every word has to match', () => {
    expect(ids({ query: 'db curl' })).toEqual(['dumbbell-curl']);
    expect(ids({ query: 'dumbbell curl' })).toEqual(
      expect.arrayContaining(['dumbbell-curl', 'hammer-curl']),
    );
  });

  test('curl search keeps dumbbell curl and hammer curl separate results', () => {
    expect(ids({ query: 'curl' }).sort()).toEqual([
      'dumbbell-curl',
      'hammer-curl',
    ]);
  });

  test('muscle group uses primary muscles only', () => {
    const arms = ids({ group: 'arms' });
    expect(arms).toEqual(
      expect.arrayContaining([
        'dumbbell-curl',
        'hammer-curl',
        'cable-triceps-pushdown',
      ]),
    );
    // Bench press works triceps, but only as a secondary muscle.
    expect(arms).not.toContain('barbell-bench-press');
  });

  test('search, muscle group and equipment combine', () => {
    expect(ids({ group: 'chest', equipment: 'dumbbell' }).sort()).toEqual([
      'dumbbell-bench-press',
      'incline-dumbbell-press',
    ]);
    expect(
      ids({ query: 'press', group: 'chest', equipment: 'barbell' }),
    ).toEqual(['barbell-bench-press']);
    expect(ids({ query: 'curl', group: 'legs' })).toEqual([]);
  });

  test('a search with no matches returns nothing', () => {
    expect(ids({ query: 'zzzz' })).toEqual([]);
  });

  test('isFilterActive', () => {
    expect(isFilterActive(emptyFilter)).toBe(false);
    expect(isFilterActive({ ...emptyFilter, query: ' ' })).toBe(false);
    expect(isFilterActive({ ...emptyFilter, equipment: 'cable' })).toBe(true);
  });
});
