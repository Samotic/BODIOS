import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { AppText, Button, Screen } from '../../components';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { RoutineList } from './RoutineList';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutinePicker'>;

/** Sheet opened from an exercise's "Add to routine". */
export function RoutinePickerScreen({ route, navigation }: Props) {
  const { exercises, routines } = useRepositories();
  const version = useDataVersion();
  const { exerciseId } = route.params;
  const data = useAsyncData(
    async () => ({
      exercise: await exercises.getById(exerciseId),
      routines: await routines.list(),
    }),
    [exercises, routines, exerciseId],
    version,
  );
  const { run } = useGuardedAction();

  if (data.status !== 'ready') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        {data.status === 'loading' ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <AppText tone="secondary">{data.error.message}</AppText>
        )}
      </Screen>
    );
  }

  const exerciseName = data.data.exercise?.name ?? 'this exercise';

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="routine-picker">
      <AppText variant="heading">Add {exerciseName} to:</AppText>
      {data.data.routines.length === 0 ? (
        <AppText tone="secondary">You don’t have any routines yet.</AppText>
      ) : (
        <RoutineList
          routines={data.data.routines}
          onOpen={routine =>
            run(async () => {
              await routines.addExercise(routine.id, exerciseId);
              navigation.popTo('ExerciseDetail', {
                exerciseId,
                addedToRoutine: routine.name,
              });
            })
          }
        />
      )}
      <Button
        title="New routine"
        variant="secondary"
        icon={Plus}
        onPress={() =>
          navigation.navigate('RoutineName', { addExerciseId: exerciseId })
        }
      />
    </Screen>
  );
}
