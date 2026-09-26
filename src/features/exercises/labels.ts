import type {
  Equipment,
  Exercise,
  Muscle,
  MuscleGroup,
  WeightConvention,
} from './types';

export const muscleGroupOrder: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
];

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
};

export const muscleGroupOf: Record<Muscle, MuscleGroup> = {
  chest: 'chest',
  'upper-chest': 'chest',
  lats: 'back',
  'upper-back': 'back',
  'lower-back': 'back',
  'front-delts': 'shoulders',
  'side-delts': 'shoulders',
  'rear-delts': 'shoulders',
  biceps: 'arms',
  brachialis: 'arms',
  forearms: 'arms',
  triceps: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  adductors: 'legs',
  abs: 'core',
  obliques: 'core',
};

export const muscleLabels: Record<Muscle, string> = {
  chest: 'Chest',
  'upper-chest': 'Upper chest',
  lats: 'Lats',
  'upper-back': 'Upper back',
  'lower-back': 'Lower back',
  'front-delts': 'Front shoulders',
  'side-delts': 'Side shoulders',
  'rear-delts': 'Rear shoulders',
  biceps: 'Biceps',
  brachialis: 'Brachialis',
  forearms: 'Forearms',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  abs: 'Abs',
  obliques: 'Obliques',
};

export const equipmentOrder: Equipment[] = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'bench',
  'pull-up-bar',
];

export const equipmentLabels: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  cable: 'Cable',
  machine: 'Machine',
  bench: 'Bench',
  'pull-up-bar': 'Pull-up bar',
  bodyweight: 'Bodyweight',
};

/** Shown next to every weight field and logged value. */
export const weightConventionLabels: Record<WeightConvention, string | null> = {
  per_dumbbell: 'Weight per dumbbell',
  total_with_bar: 'Total including bar',
  machine: 'Weight shown on the machine',
  added_load: 'Added weight (0 = bodyweight only)',
  none: null,
};

/** The muscle groups an exercise's primary muscles belong to, in display order. */
export function muscleGroupsOf(
  exercise: Pick<Exercise, 'primaryMuscles'>,
): MuscleGroup[] {
  const groups = new Set(exercise.primaryMuscles.map(m => muscleGroupOf[m]));
  return muscleGroupOrder.filter(g => groups.has(g));
}
