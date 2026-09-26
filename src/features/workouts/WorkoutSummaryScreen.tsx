import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchX, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
} from '../../components';
import { useRepositories } from '../../db/DatabaseProvider';
import { formatDuration } from '../../lib/dates';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { weightConventionLabels } from '../exercises/labels';
import { useWeightUnit } from '../settings/useWeightUnit';
import { describeSet } from './setRules';
import { summarize } from './summary';

type SummaryProps = NativeStackScreenProps<
  RootStackParamList,
  'WorkoutSummary'
>;
type DetailProps = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

function longDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Shown right after finishing a workout. */
export function WorkoutSummaryScreen({ route, navigation }: SummaryProps) {
  return (
    <WorkoutReport
      sessionId={route.params.sessionId}
      variant="summary"
      onDone={() => navigation.popTo('Tabs', { screen: 'Home' })}
      onGone={() => navigation.popToTop()}
    />
  );
}

/** A past workout opened from Progress → History. Can be deleted. */
export function SessionDetailScreen({ route, navigation }: DetailProps) {
  return (
    <WorkoutReport
      sessionId={route.params.sessionId}
      variant="history"
      onDone={() => navigation.goBack()}
      onGone={() => navigation.goBack()}
    />
  );
}

/**
 * What was actually done: duration, completed sets and notes. Built only
 * from sets marked done; no calorie or other estimates.
 */
function WorkoutReport({
  sessionId,
  variant,
  onDone,
  onGone,
}: {
  sessionId: string;
  variant: 'summary' | 'history';
  onDone: () => void;
  onGone: () => void;
}) {
  const { workouts, history } = useRepositories();
  const { run } = useGuardedAction();
  const unit = useWeightUnit();
  const result = useAsyncData(
    () => workouts.getSession(sessionId),
    [workouts, sessionId],
  );
  const [notes, setNotes] = useState<string | null>(null);

  const session = result.status === 'ready' ? result.data : null;
  useEffect(() => {
    if (session && notes === null) {
      setNotes(session.notes);
    }
  }, [session, notes]);

  if (result.status === 'loading') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={SearchX}
          title="Workout not found"
          message="It may have been deleted."
          action={{ title: 'Go back', onPress: onGone }}
        />
      </Screen>
    );
  }

  const summary = summarize(session);

  const confirmDelete = () =>
    Alert.alert(
      'Delete this workout?',
      'It will be removed from your history, best lifts and charts. This can’t be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await history.deleteWorkout(session.id);
              onDone();
            }),
        },
      ],
    );

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      testID={variant === 'summary' ? 'workout-summary' : 'session-detail'}
      footer={
        variant === 'summary' ? (
          <Button title="Done" onPress={onDone} testID="summary-done" />
        ) : undefined
      }
    >
      <View style={styles.titleBlock}>
        <AppText variant="display">
          {variant === 'summary'
            ? 'Workout complete'
            : session.routineName ?? 'Workout'}
        </AppText>
        <AppText tone="secondary">
          {[session.routineName, longDate(session.trainingLocalDate)]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <AppText variant="caption" tone="secondary">
            Duration
          </AppText>
          <AppText variant="heading" testID="summary-duration">
            {formatDuration(summary.durationMs)}
          </AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="caption" tone="secondary">
            Sets done
          </AppText>
          <AppText variant="heading" testID="summary-sets">
            {summary.completedSetCount}
          </AppText>
        </Card>
      </View>

      {summary.exercises.map(exercise => {
        const convention = weightConventionLabels[exercise.weightConvention];
        return (
          <Card key={exercise.id}>
            <AppText variant="heading">{exercise.name}</AppText>
            {convention ? (
              <AppText variant="caption" tone="secondary">
                {convention}
              </AppText>
            ) : null}
            {exercise.sets.map((set, index) => (
              <AppText key={set.id}>
                Set {index + 1}:{' '}
                {describeSet(
                  set,
                  exercise.trackingType,
                  exercise.weightConvention,
                  unit,
                )}
              </AppText>
            ))}
          </Card>
        );
      })}

      <Input
        label="Notes"
        placeholder="How did it feel?"
        value={notes ?? ''}
        onChangeText={text => {
          setNotes(text);
          workouts.setNotes(session.id, text).catch(() => {});
        }}
        multiline
        maxLength={2000}
        testID="summary-notes"
      />

      {variant === 'history' ? (
        <Button
          title="Delete workout"
          variant="ghost"
          icon={Trash2}
          accessibilityHint="Asks for confirmation before deleting"
          onPress={confirmDelete}
          testID="delete-workout"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
  },
});
