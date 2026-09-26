import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { ExerciseDemoSheet } from '../features/exercises/ExerciseDemoSheet';
import { ExerciseDetailScreen } from '../features/exercises/ExerciseDetailScreen';
import { ExercisePickerScreen } from '../features/routines/ExercisePickerScreen';
import { RoutineEditorScreen } from '../features/routines/RoutineEditorScreen';
import { RoutineNameScreen } from '../features/routines/RoutineNameScreen';
import { RoutinePickerScreen } from '../features/routines/RoutinePickerScreen';
import { ActiveWorkoutScreen } from '../features/workouts/ActiveWorkoutScreen';
import { MediaCreditsScreen } from '../features/profile/MediaCreditsScreen';
import { PrivacyScreen } from '../features/profile/PrivacyScreen';
import { ExerciseProgressScreen } from '../features/progress/ExerciseProgressScreen';
import {
  SessionDetailScreen,
  WorkoutSummaryScreen,
} from '../features/workouts/WorkoutSummaryScreen';
import { colors, navigationTheme } from '../theme';
import { HeaderCancelButton } from './HeaderCancelButton';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderCancel() {
  return <HeaderCancelButton />;
}

function renderDone() {
  return <HeaderCancelButton label="Done" testID="demo-done" />;
}

/** Sheets slide up, close with a swipe down or Cancel. */
const sheetOptions: NativeStackNavigationOptions = {
  presentation: 'modal',
  headerLeft: renderCancel,
};

/** Lets code outside screens (and tests) navigate or go back. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExerciseDetail"
          component={ExerciseDetailScreen}
          options={{ title: 'Exercise' }}
        />
        <Stack.Screen
          name="RoutineEditor"
          component={RoutineEditorScreen}
          options={{ title: 'Routine' }}
        />
        <Stack.Screen
          name="ActiveWorkout"
          component={ActiveWorkoutScreen}
          options={{ title: 'Workout' }}
        />
        <Stack.Screen
          name="WorkoutSummary"
          component={WorkoutSummaryScreen}
          options={{
            title: 'Summary',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="SessionDetail"
          component={SessionDetailScreen}
          options={{ title: 'Workout' }}
        />
        <Stack.Screen
          name="ExerciseProgress"
          component={ExerciseProgressScreen}
          options={{ title: 'Progress' }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyScreen}
          options={{ title: 'Privacy' }}
        />
        <Stack.Screen
          name="MediaCredits"
          component={MediaCreditsScreen}
          options={{ title: 'Credits' }}
        />
        <Stack.Group screenOptions={sheetOptions}>
          <Stack.Screen
            name="RoutineName"
            component={RoutineNameScreen}
            options={({ route }) => ({
              title: route.params?.routineId ? 'Rename routine' : 'New routine',
            })}
          />
          <Stack.Screen
            name="ExercisePicker"
            component={ExercisePickerScreen}
            options={{ title: 'Add exercise' }}
          />
          <Stack.Screen
            name="RoutinePicker"
            component={RoutinePickerScreen}
            options={{ title: 'Add to routine' }}
          />
          <Stack.Screen
            name="ExerciseDemo"
            component={ExerciseDemoSheet}
            options={{
              title: 'Demonstration',
              headerLeft: undefined,
              headerRight: renderDone,
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
