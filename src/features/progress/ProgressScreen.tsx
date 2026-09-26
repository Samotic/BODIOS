import { useNavigation } from '@react-navigation/native';
import {
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Card,
  EmptyState,
  FilterChip,
  IconButton,
  Screen,
} from '../../components';
import { BarChart } from '../../components/charts/BarChart';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatDuration } from '../../lib/dates';
import { colors, radii, spacing } from '../../theme';
import { weightConventionLabels } from '../exercises/labels';
import { formatWeight } from '../settings/units';
import { useWeightUnit } from '../settings/useWeightUnit';
import {
  bestLifts,
  durationOf,
  periodStats,
  workoutsPerBucket,
  type HistoryEntry,
} from './metrics';
import { bucketsFor, inRange, periodFor, type PeriodKind } from './periods';

export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const workoutsLabel = (n: number) => (n === 1 ? '1 workout' : `${n} workouts`);

/**
 * Real history only: best lifts, then a week/month view whose stats, chart
 * and list all use the same period. Nothing here is estimated or invented.
 */
export function ProgressScreen() {
  const navigation = useNavigation();
  const { history } = useRepositories();
  const version = useDataVersion();
  const unit = useWeightUnit();
  const data = useAsyncData(
    async () => ({
      workouts: await history.listWorkouts(),
      lifts: await history.liftSets(),
    }),
    [history],
    version,
  );
  const [kind, setKind] = useState<PeriodKind>('week');
  const [offset, setOffset] = useState(0);

  const period = useMemo(
    () => periodFor(kind, new Date(), offset),
    [kind, offset],
  );
  const buckets = useMemo(() => bucketsFor(period), [period]);

  if (data.status === 'loading') {
    return (
      <Screen testID="progress-screen">
        <AppText variant="display">Your progress</AppText>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen testID="progress-screen">
        <AppText variant="display">Your progress</AppText>
        <EmptyState
          icon={TriangleAlert}
          title="Couldn’t load your history"
          message={data.error.message}
          action={{ title: 'Try again', onPress: data.reload }}
        />
      </Screen>
    );
  }

  const { workouts, lifts } = data.data;
  if (workouts.length === 0) {
    return (
      <Screen testID="progress-screen">
        <AppText variant="display">Your progress</AppText>
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No workouts yet"
          message="Finish your first workout and your history and best lifts will appear here."
        />
      </Screen>
    );
  }

  const bests = bestLifts(lifts);
  const stats = periodStats(workouts, period);
  const counts = workoutsPerBucket(workouts, buckets);
  const inPeriod = workouts.filter(w => inRange(w.trainingLocalDate, period));

  return (
    <Screen testID="progress-screen">
      <AppText variant="display">Your progress</AppText>

      <View style={styles.sectionHeader}>
        <AppText variant="heading">Best lifts</AppText>
        <AppText variant="caption" tone="secondary">
          All time
        </AppText>
      </View>
      {bests.length === 0 ? (
        <AppText tone="secondary">
          Weighted sets you complete will show here.
        </AppText>
      ) : (
        <View style={styles.list}>
          {bests.map(best => (
            <Pressable
              key={`${best.exerciseId}-${best.weightConvention}`}
              onPress={() =>
                navigation.navigate('ExerciseProgress', {
                  exerciseId: best.exerciseId,
                  weightConvention: best.weightConvention,
                })
              }
              accessibilityRole="button"
              accessibilityHint="Shows this exercise’s progress"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              testID={`best-${best.exerciseId}`}
            >
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{best.exerciseName}</AppText>
                <AppText variant="caption" tone="secondary">
                  {weightConventionLabels[best.weightConvention]} ·{' '}
                  {formatShortDate(best.trainingLocalDate)}
                </AppText>
              </View>
              <AppText variant="bodyStrong">
                {formatWeight(best.weightKg, unit)} × {best.reps}
              </AppText>
              <ChevronRight color={colors.textSecondary} size={18} />
            </Pressable>
          ))}
        </View>
      )}

      {/* The period filter scopes everything below it. */}
      <View style={styles.filters}>
        <View style={styles.chips}>
          <FilterChip
            label="Week"
            selected={kind === 'week'}
            onPress={() => {
              setKind('week');
              setOffset(0);
            }}
          />
          <FilterChip
            label="Month"
            selected={kind === 'month'}
            onPress={() => {
              setKind('month');
              setOffset(0);
            }}
          />
        </View>
        <View style={styles.periodNav}>
          <IconButton
            label={kind === 'week' ? 'Previous week' : 'Previous month'}
            icon={ChevronLeft}
            onPress={() => setOffset(o => o - 1)}
            testID="period-previous"
          />
          <AppText
            variant="bodyStrong"
            style={styles.periodLabel}
            testID="period-label"
          >
            {period.label}
          </AppText>
          <IconButton
            label={kind === 'week' ? 'Next week' : 'Next month'}
            icon={ChevronRight}
            disabled={offset >= 0}
            onPress={() => setOffset(o => Math.min(0, o + 1))}
            testID="period-next"
          />
        </View>
      </View>

      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <AppText variant="caption" tone="secondary">
            Workouts
          </AppText>
          <AppText variant="title" testID="stat-workouts">
            {stats.workouts}
          </AppText>
        </Card>
        <Card style={styles.tile}>
          <AppText variant="caption" tone="secondary">
            Active days
          </AppText>
          <AppText variant="title" testID="stat-days">
            {stats.activeDays}
          </AppText>
        </Card>
        <Card style={styles.tile}>
          <AppText variant="caption" tone="secondary">
            Time
          </AppText>
          <AppText
            variant="bodyStrong"
            style={styles.tileTime}
            testID="stat-time"
          >
            {stats.totalDurationMs > 0
              ? formatDuration(stats.totalDurationMs)
              : '0 min'}
          </AppText>
        </Card>
      </View>

      <Card>
        <AppText variant="heading">
          {kind === 'week' ? 'Workouts per day' : 'Workouts per week'}
        </AppText>
        <BarChart
          data={buckets.map((b, i) => ({
            label: b.label,
            longLabel: b.longLabel,
            value: counts[i],
          }))}
          formatValue={workoutsLabel}
          testID="workouts-chart"
        />
      </Card>

      <AppText variant="heading">History</AppText>
      {inPeriod.length === 0 ? (
        <AppText tone="secondary">No workouts in this period.</AppText>
      ) : (
        <View style={styles.list}>
          {inPeriod.map(entry => (
            <HistoryRow
              key={entry.sessionId}
              entry={entry}
              onPress={() =>
                navigation.navigate('SessionDetail', {
                  sessionId: entry.sessionId,
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function HistoryRow({
  entry,
  onPress,
}: {
  entry: HistoryEntry;
  onPress: () => void;
}) {
  const sets =
    entry.completedWorkSets === 1 ? '1 set' : `${entry.completedWorkSets} sets`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens this workout"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`history-${entry.sessionId}`}
    >
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{entry.routineName ?? 'Workout'}</AppText>
        <AppText variant="caption" tone="secondary">
          {formatShortDate(entry.trainingLocalDate)} ·{' '}
          {formatDuration(durationOf(entry))} · {sets}
        </AppText>
      </View>
      <ChevronRight color={colors.textSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  flex: {
    flex: 1,
  },
  filters: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  periodLabel: {
    flex: 1,
    textAlign: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
  },
  tileTime: {
    fontSize: 18,
  },
});
