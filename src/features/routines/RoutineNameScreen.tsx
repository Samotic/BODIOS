import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Button, Input, Screen } from '../../components';
import { useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import type { RootStackParamList } from '../../navigation/types';
import { checkRoutineName, limits } from './rules';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutineName'>;

/**
 * Sheet for naming a new routine or renaming one. When opened from an
 * exercise's "Add to routine", the new routine starts with that exercise.
 */
export function RoutineNameScreen({ route, navigation }: Props) {
  const { routines } = useRepositories();
  const { routineId, addExerciseId } = route.params ?? {};
  const existing = useAsyncData(
    async () => (routineId ? routines.get(routineId) : null),
    [routines, routineId],
  );
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const { run, isBusy } = useGuardedAction();

  const existingName =
    existing.status === 'ready' ? existing.data?.name : undefined;
  useEffect(() => {
    if (existingName) {
      setName(existingName);
    }
  }, [existingName]);

  const save = () =>
    run(async () => {
      const checked = checkRoutineName(name);
      if (!checked.ok) {
        setError(checked.error);
        return;
      }
      if (routineId) {
        await routines.rename(routineId, checked.name);
        navigation.goBack();
        return;
      }
      const routine = await routines.create(checked.name);
      if (addExerciseId) {
        await routines.addExercise(routine.id, addExerciseId);
        navigation.popTo('ExerciseDetail', {
          exerciseId: addExerciseId,
          addedToRoutine: routine.name,
        });
      } else {
        navigation.replace('RoutineEditor', { routineId: routine.id });
      }
    });

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="routine-name-screen">
      <Input
        label="Routine name"
        placeholder="e.g. Push day"
        value={name}
        onChangeText={text => {
          setName(text);
          setError(undefined);
        }}
        error={error}
        maxLength={limits.nameLength}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        testID="routine-name-input"
      />
      <Button
        title={routineId ? 'Save name' : 'Create routine'}
        onPress={save}
        disabled={isBusy}
        testID="routine-name-save"
      />
    </Screen>
  );
}
