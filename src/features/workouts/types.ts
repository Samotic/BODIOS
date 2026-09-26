import type { TrackingType, WeightConvention } from '../exercises/types';
import type { RestTimer } from './restTimer';

export type SetType = 'warmup' | 'work';

export type WorkoutSet = {
  id: string;
  sessionExerciseId: string;
  position: number;
  type: SetType;
  /** Always kilograms; converted only for display. Null until entered. */
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  /** Set when the user marks the set done. */
  completedAt: string | null;
};

/** An exercise inside a session, with the details copied at start. */
export type SessionExercise = {
  id: string;
  sessionId: string;
  exerciseId: string;
  position: number;
  name: string;
  trackingType: TrackingType;
  weightConvention: WeightConvention;
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  restSeconds: number;
  sets: WorkoutSet[];
};

export type SessionStatus = 'in_progress' | 'finished';

export type WorkoutSession = {
  id: string;
  routineId: string | null;
  routineName: string | null;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  /** The local calendar day the workout started on, e.g. "2026-09-26". */
  trainingLocalDate: string;
  timezone: string;
  pausedDurationMs: number;
  notes: string;
};

export type ActiveState = {
  currentSessionExerciseId: string | null;
  rest: RestTimer;
};

export type SessionDetail = WorkoutSession & {
  exercises: SessionExercise[];
  /** Only for the in-progress session. */
  active: ActiveState | null;
};

/** The completed working sets from the last finished session with this exercise. */
export type PreviousPerformance = {
  sessionId: string;
  trainingLocalDate: string;
  sets: Array<Pick<WorkoutSet, 'weightKg' | 'reps' | 'durationSeconds'>>;
};
