import { useNavigation } from '@react-navigation/native';
import { Plus, Search, TriangleAlert } from 'lucide-react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  EmptyState,
  FilterChip,
  SearchField,
} from '../../components';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { colors, screenPadding, spacing } from '../../theme';
import { RoutineList } from '../routines/RoutineList';
import { ExerciseListItem } from './ExerciseListItem';
import {
  emptyFilter,
  filterExercises,
  isFilterActive,
  type ExerciseFilter,
} from './filterExercises';
import { equipmentLabels, muscleGroupLabels, muscleGroupOrder } from './labels';
import type { Equipment, Exercise } from './types';

const equipmentFilters: Equipment[] = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
];

/**
 * Workouts tab: saved routines, then the searchable, filterable exercise
 * library.
 */
export function WorkoutsScreen() {
  const navigation = useNavigation();
  const { exercises, routines } = useRepositories();
  const version = useDataVersion();
  const list = useAsyncData(() => exercises.list(), [exercises]);
  const saved = useAsyncData(() => routines.list(), [routines], version);
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter);

  const results = useMemo(
    () => (list.status === 'ready' ? filterExercises(list.data, filter) : []),
    [list.status, list.data, filter],
  );

  const openExercise = useCallback(
    (exercise: Exercise) =>
      navigation.navigate('ExerciseDetail', { exerciseId: exercise.id }),
    [navigation],
  );

  const header = (
    <View style={styles.header}>
      <AppText variant="display">Workouts</AppText>

      <AppText variant="heading">Routines</AppText>
      {saved.status === 'ready' && saved.data.length > 0 ? (
        <RoutineList
          routines={saved.data}
          onOpen={routine =>
            navigation.navigate('RoutineEditor', { routineId: routine.id })
          }
        />
      ) : saved.status === 'ready' ? (
        <AppText tone="secondary">
          No routines yet. Create one, or add exercises to a routine from their
          detail page.
        </AppText>
      ) : null}
      <Button
        title="New routine"
        variant="secondary"
        icon={Plus}
        onPress={() => navigation.navigate('RoutineName')}
        testID="new-routine"
      />

      <AppText variant="heading" style={styles.sectionGap}>
        Exercises
      </AppText>
      <SearchField
        value={filter.query}
        onChangeText={query => setFilter(f => ({ ...f, query }))}
        placeholder="Search exercises"
        accessibilityLabel="Search exercises"
        testID="exercise-search"
      />
      <ChipRow>
        <FilterChip
          label="All"
          selected={filter.group === null}
          onPress={() => setFilter(f => ({ ...f, group: null }))}
          accessibilityHint="Shows every muscle group"
        />
        {muscleGroupOrder.map(group => (
          <FilterChip
            key={group}
            label={muscleGroupLabels[group]}
            selected={filter.group === group}
            onPress={() =>
              setFilter(f => ({
                ...f,
                group: f.group === group ? null : group,
              }))
            }
            accessibilityHint="Muscle group filter"
          />
        ))}
      </ChipRow>
      <ChipRow>
        <FilterChip
          label="Any equipment"
          selected={filter.equipment === null}
          onPress={() => setFilter(f => ({ ...f, equipment: null }))}
          accessibilityHint="Shows every type of equipment"
        />
        {equipmentFilters.map(equipment => (
          <FilterChip
            key={equipment}
            label={equipmentLabels[equipment]}
            selected={filter.equipment === equipment}
            onPress={() =>
              setFilter(f => ({
                ...f,
                equipment: f.equipment === equipment ? null : equipment,
              }))
            }
            accessibilityHint="Equipment filter"
          />
        ))}
      </ChipRow>
      {list.status === 'ready' && results.length > 0 ? (
        <AppText
          variant="caption"
          tone="secondary"
          accessibilityLiveRegion="polite"
        >
          {results.length === 1 ? '1 exercise' : `${results.length} exercises`}
        </AppText>
      ) : null}
    </View>
  );

  let empty;
  if (list.status === 'loading') {
    empty = (
      <ActivityIndicator
        color={colors.accent}
        accessibilityLabel="Loading exercises"
      />
    );
  } else if (list.status === 'error') {
    empty = (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn’t load exercises"
        message={list.error.message}
        action={{ title: 'Try again', onPress: list.reload }}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={Search}
        title="No matching exercises"
        message={
          filter.query.trim()
            ? `Nothing matches “${filter.query.trim()}” with the current filters.`
            : 'Nothing matches the current filters.'
        }
        action={
          isFilterActive(filter)
            ? {
                title: 'Clear search and filters',
                onPress: () => setFilter(emptyFilter),
              }
            : undefined
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        testID="workouts-screen"
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExerciseListItem exercise={item} onPress={openExercise} />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      />
    </SafeAreaView>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      // Let chips scroll edge to edge while lining up with the screen padding.
      style={styles.chipScroller}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
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
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  chipScroller: {
    marginHorizontal: -screenPadding,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.sm,
  },
});
