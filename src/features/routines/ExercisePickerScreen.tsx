import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, SearchField } from '../../components';
import { useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import type { RootStackParamList } from '../../navigation/types';
import { colors, screenPadding, spacing } from '../../theme';
import { ExerciseListItem } from '../exercises/ExerciseListItem';
import { emptyFilter, filterExercises } from '../exercises/filterExercises';

type Props = NativeStackScreenProps<RootStackParamList, 'ExercisePicker'>;

/** Sheet for adding an exercise to a routine. Tap one to add it and close. */
export function ExercisePickerScreen({ route, navigation }: Props) {
  const { exercises, routines } = useRepositories();
  const { routineId } = route.params;
  const list = useAsyncData(() => exercises.list(), [exercises]);
  const [query, setQuery] = useState('');
  const { run } = useGuardedAction();

  const results = useMemo(
    () =>
      list.status === 'ready'
        ? filterExercises(list.data, { ...emptyFilter, query })
        : [],
    [list.status, list.data, query],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <FlatList
        testID="exercise-picker"
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExerciseListItem
            exercise={item}
            onPress={exercise =>
              run(async () => {
                await routines.addExercise(routineId, exercise.id);
                navigation.goBack();
              })
            }
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              accessibilityLabel="Search exercises"
              testID="picker-search"
            />
          </View>
        }
        ListEmptyComponent={
          list.status === 'loading' ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <EmptyState
              icon={Search}
              title="No matching exercises"
              message="Try a different search."
            />
          )
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingVertical: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
});
