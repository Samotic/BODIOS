import type { TrackingType, WeightConvention } from '../exercises/types';

export type Routine = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/** What the routine plans for one exercise. Never holds logged results. */
export type RoutineTargets = {
  targetSets: number;
  /** For rep-based exercises; null for timed ones. */
  targetReps: number | null;
  /** For timed exercises; null for rep-based ones. */
  targetDurationSeconds: number | null;
  restSeconds: number;
};

export type RoutineExercise = RoutineTargets & {
  id: string;
  routineId: string;
  exerciseId: string;
  position: number;
  // Joined from the exercise, for display.
  exerciseName: string;
  trackingType: TrackingType;
  weightConvention: WeightConvention;
};

export type RoutineSummary = Routine & {
  exerciseCount: number;
};

export type RoutineWithExercises = Routine & {
  exercises: RoutineExercise[];
};
