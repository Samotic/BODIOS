import type { NavigatorScreenParams } from '@react-navigation/native';
import type { WeightConvention } from '../features/exercises/types';

/** The four bottom tabs. */
export type TabParamList = {
  Home: undefined;
  Workouts: undefined;
  Progress: undefined;
  Profile: undefined;
};

/** Screens pushed on top of the tabs (swipe-back works on each). */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  /** addedToRoutine: shown as a confirmation after "Add to routine". */
  ExerciseDetail: { exerciseId: string; addedToRoutine?: string };
  RoutineEditor: { routineId: string };
  ActiveWorkout: { sessionId: string };
  WorkoutSummary: { sessionId: string };
  SessionDetail: { sessionId: string };
  ExerciseProgress: { exerciseId: string; weightConvention: WeightConvention };
  PrivacyPolicy: undefined;
  MediaCredits: undefined;
  // Sheets (modal presentation)
  RoutineName: { routineId?: string; addExerciseId?: string } | undefined;
  ExercisePicker: { routineId: string };
  RoutinePicker: { exerciseId: string };
  /** "Watch demonstration" during a workout. */
  ExerciseDemo: { exerciseId: string };
};

// Lets useNavigation() type-check route names and params everywhere.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
