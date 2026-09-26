import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ListPlus,
  Pencil,
  Play,
  Plus,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { AppText, Button, EmptyState, Screen } from '../../components';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import { WorkoutInProgressError } from '../workouts/workoutRepository';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { RoutineExerciseCard } from './RoutineExerciseCard';
import { exerciseCountLabel } from './RoutineList';
import { canStartRoutine } from './rules';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutineEditor'>;

function showSaveError(error: unknown) {
  Alert.alert(
    'Couldn’t save',
    error instanceof Error ? error.message : String(error),
  );
}

/**
 * Edit a routine: its exercises, their targets and order. Every change is
 * saved straight away.
 */
export function RoutineEditorScreen({ route, navigation }: Props) {
  const { routines, workouts } = useRepositories();
  const version = useDataVersion();
  const { routineId } = route.params;
  const { run, isBusy } = useGuardedAction();
  const result = useAsyncData(
    () => routines.get(routineId),
    [routines, routineId],
    version,
  );
  const routine = result.status === 'ready' ? result.data : null;

  useEffect(() => {
    if (routine) {
      navigation.setOptions({ title: routine.name });
    }
  }, [navigation, routine]);

  const openPicker = () => navigation.navigate('ExercisePicker', { routineId });

  const confirmDelete = () => {
    if (!routine) {
      return;
    }
    Alert.alert(
      `Delete “${routine.name}”?`,
      'This deletes the routine and its targets. Workouts you have already logged are not affected.',
      [
        { text: 'Keep routine', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            routines
              .remove(routineId)
              .then(() => navigation.goBack(), showSaveError),
        },
      ],
    );
  };

  if (result.status === 'loading') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Loading routine"
        />
      </Screen>
    );
  }
  if (result.status === 'error') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={TriangleAlert}
          title="Couldn’t load this routine"
          message={result.error.message}
          action={{ title: 'Try again', onPress: result.reload }}
        />
      </Screen>
    );
  }
  if (!routine) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={SearchX}
          title="Routine not found"
          message="It may have been deleted."
          action={{ title: 'Go back', onPress: () => navigation.goBack() }}
        />
      </Screen>
    );
  }

  const count = routine.exercises.length;

  const startWorkout = () =>
    run(async () => {
      try {
        const sessionId = await workouts.startFromRoutine(routineId);
        navigation.navigate('ActiveWorkout', { sessionId });
      } catch (error) {
        if (!(error instanceof WorkoutInProgressError)) {
          throw error;
        }
        Alert.alert(
          'A workout is already in progress',
          'Finish or discard it before starting another.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Resume it',
              onPress: () =>
                navigation.navigate('ActiveWorkout', {
                  sessionId: error.sessionId,
                }),
            },
          ],
        );
      }
    }, 'Couldn’t start the workout');

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      testID="routine-editor"
      footer={
        <Button
          title="Start workout"
          icon={Play}
          disabled={!canStartRoutine(routine) || isBusy}
          accessibilityHint={
            canStartRoutine(routine)
              ? undefined
              : 'Add at least one exercise first'
          }
          onPress={startWorkout}
          testID="start-workout"
        />
      }
    >
      <AppText tone="secondary" accessibilityLiveRegion="polite">
        {count === 0
          ? 'Add at least one exercise before you can start this routine.'
          : exerciseCountLabel(count)}
      </AppText>

      {count === 0 ? (
        <EmptyState
          icon={ListPlus}
          title="No exercises yet"
          message="Pick exercises from the library and set your targets."
          action={{ title: 'Add exercise', onPress: openPicker }}
        />
      ) : (
        <>
          {routine.exercises.map((item, index) => (
            <RoutineExerciseCard
              key={item.id}
              item={item}
              number={index + 1}
              isFirst={index === 0}
              isLast={index === count - 1}
              onChangeTargets={targets =>
                routines.updateTargets(item.id, targets).catch(showSaveError)
              }
              onMove={direction =>
                routines.moveExercise(item.id, direction).catch(showSaveError)
              }
              onRemove={() =>
                routines.removeExercise(item.id).catch(showSaveError)
              }
            />
          ))}
          <Button
            title="Add exercise"
            variant="secondary"
            icon={Plus}
            onPress={openPicker}
          />
        </>
      )}

      <Button
        title="Rename routine"
        variant="ghost"
        icon={Pencil}
        onPress={() => navigation.navigate('RoutineName', { routineId })}
      />
      <Button
        title="Delete routine"
        variant="ghost"
        icon={Trash2}
        onPress={confirmDelete}
      />
    </Screen>
  );
}
