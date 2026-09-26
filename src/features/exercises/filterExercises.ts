import { equipmentLabels, muscleGroupsOf, muscleLabels } from './labels';
import type { Equipment, Exercise, MuscleGroup } from './types';

export type ExerciseFilter = {
  query: string;
  group: MuscleGroup | null;
  equipment: Equipment | null;
};

export const emptyFilter: ExerciseFilter = {
  query: '',
  group: null,
  equipment: null,
};

/** Lowercase and strip accents so "Curl", "curl" and "cúrl" all match. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function searchText(exercise: Exercise): string {
  return normalize(
    [
      exercise.name,
      ...exercise.aliases,
      ...exercise.primaryMuscles.map(m => muscleLabels[m]),
      ...exercise.secondaryMuscles.map(m => muscleLabels[m]),
      ...exercise.equipment.map(e => equipmentLabels[e]),
    ].join(' '),
  );
}

function words(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** 0: a name starts with the typed phrase, 1: a name contains it, 2: other matches. */
function rank(exercise: Exercise, phrase: string): number {
  const names = [exercise.name, ...exercise.aliases].map(n =>
    words(n).join(' '),
  );
  if (names.some(n => n.startsWith(phrase))) {
    return 0;
  }
  return names.some(n => n.includes(phrase)) ? 1 : 2;
}

/**
 * Search matches every typed word against the name, other names, muscles and
 * equipment, so "db curl" finds Dumbbell Curl and "dumbbell chest" finds the
 * dumbbell presses. Exercises whose name contains the typed phrase come
 * first; otherwise the input order is kept. The muscle-group filter uses
 * primary muscles only.
 */
export function filterExercises(
  exercises: Exercise[],
  filter: ExerciseFilter,
): Exercise[] {
  const queryWords = words(filter.query);

  const matches = exercises.filter(exercise => {
    if (filter.group && !muscleGroupsOf(exercise).includes(filter.group)) {
      return false;
    }
    if (filter.equipment && !exercise.equipment.includes(filter.equipment)) {
      return false;
    }
    if (queryWords.length === 0) {
      return true;
    }
    const text = searchText(exercise);
    return queryWords.every(word => text.includes(word));
  });

  if (queryWords.length === 0) {
    return matches;
  }
  const phrase = queryWords.join(' ');
  // Array.prototype.sort is stable, so equal ranks keep alphabetical order.
  return matches
    .map(exercise => ({ exercise, rank: rank(exercise, phrase) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ exercise }) => exercise);
}

export function isFilterActive(filter: ExerciseFilter): boolean {
  return (
    filter.query.trim() !== '' ||
    filter.group !== null ||
    filter.equipment !== null
  );
}
