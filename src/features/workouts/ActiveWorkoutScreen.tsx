import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Play,
  Plus,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Screen,
} from '../../components';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { weightConventionLabels } from '../exercises/labels';
import { formatSeconds } from '../routines/rules';
import { useWeightUnit } from '../settings/useWeightUnit';
import { RestTimerCard } from './RestTimerCard';
import { adjustRest, noRest, pauseRest, resumeRest } from './restTimer';
import { SetHeader, SetRow } from './SetRow';
import { describeSet } from './setRules';
import type { SessionDetail, SessionExercise } from './types';
import { WorkoutInputError } from './workoutRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveWorkout'>;

function targetText(exercise: SessionExercise): string {
  const sets = exercise.targetSets ?? exercise.sets.length;
  const each =
    exercise.trackingType === 'duration'
      ? formatSeconds(exercise.targetDurationSeconds ?? 0)
      : `${exercise.targetReps ?? '–'} reps`;
  return `Target ${sets} × ${each} · Rest ${formatSeconds(
    exercise.restSeconds,
  )}`;
}

function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * The workout in progress. Everything is saved to the database as you go,
 * so leaving this screen, backgrounding or force-quitting the app loses
 * nothing: Home offers "Resume workout".
 */
export function ActiveWorkoutScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { workouts } = useRepositories();
  const version = useDataVersion();
  const unit = useWeightUnit();
  const result = useAsyncData(
    () => workouts.getSession(sessionId),
    [workouts, sessionId],
    version,
  );
  const session = result.status === 'ready' ? result.data : null;

  // A finished session belongs on its summary, not in the logger.
  useEffect(() => {
    if (session?.status === 'finished') {
      navigation.replace('WorkoutSummary', { sessionId });
    }
  }, [navigation, session?.status, sessionId]);

  if (result.status === 'loading') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Loading workout"
        />
      </Screen>
    );
  }
  if (result.status === 'error') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={TriangleAlert}
          title="Couldn’t load this workout"
          message={result.error.message}
          action={{ title: 'Try again', onPress: result.reload }}
        />
      </Screen>
    );
  }
  if (!session || session.status !== 'in_progress') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={SearchX}
          title="No workout in progress"
          message="This workout was finished or discarded."
          action={{ title: 'Go back', onPress: () => navigation.goBack() }}
        />
      </Screen>
    );
  }

  return (
    <WorkoutLogger session={session} navigation={navigation} unit={unit} />
  );
}

function WorkoutLogger({
  session,
  navigation,
  unit,
}: {
  session: SessionDetail;
  navigation: Props['navigation'];
  unit: ReturnType<typeof useWeightUnit>;
}) {
  const { workouts } = useRepositories();
  const { run } = useGuardedAction();
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(session.notes);

  const exercises = session.exercises;
  const currentIndex = Math.max(
    0,
    exercises.findIndex(e => e.id === session.active?.currentSessionExerciseId),
  );
  const current = exercises[currentIndex];
  const next = exercises[currentIndex + 1];
  const rest = session.active?.rest ?? noRest;

  const previous = useAsyncData(
    () =>
      workouts.getPreviousPerformance(
        current.exerciseId,
        current.weightConvention,
        session.id,
      ),
    [workouts, current.exerciseId, current.weightConvention, session.id],
  );

  const totals = useMemo(() => {
    const all = exercises.flatMap(e => e.sets);
    return { done: all.filter(s => s.completedAt).length, total: all.length };
  }, [exercises]);

  const nextIncomplete = current.sets.find(s => s.completedAt === null);
  const hasBlankIncomplete = current.sets.some(
    s =>
      !s.completedAt &&
      s.weightKg === null &&
      s.reps === null &&
      s.durationSeconds === null,
  );

  const goTo = (index: number) =>
    run(() => workouts.setCurrentExercise(session.id, exercises[index].id));

  const toggle = (setId: string, done: boolean) =>
    run(async () => {
      try {
        if (done) {
          await workouts.uncompleteSet(setId);
        } else {
          await workouts.completeSet(setId);
        }
        setRowErrors(errors => ({ ...errors, [setId]: '' }));
      } catch (error) {
        if (error instanceof WorkoutInputError) {
          setRowErrors(errors => ({ ...errors, [setId]: error.message }));
          return;
        }
        throw error;
      }
    });

  const finish = () => {
    const unfinished = exercises
      .flatMap(e => e.sets)
      .filter(s => !s.completedAt).length;
    Alert.alert(
      'Finish workout?',
      unfinished > 0
        ? `${totals.done} sets done. The ${unfinished} set${
            unfinished === 1 ? '' : 's'
          } not marked done won’t be saved.`
        : `${totals.done} sets done.`,
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () =>
            run(async () => {
              await workouts.finish(session.id);
              navigation.replace('WorkoutSummary', { sessionId: session.id });
            }, 'Can’t finish yet'),
        },
      ],
    );
  };

  const discard = () =>
    Alert.alert(
      'Discard this workout?',
      'This deletes the workout in progress, including every set and note. It can’t be undone.',
      [
        { text: 'Keep workout', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await workouts.discard(session.id);
              navigation.goBack();
            }),
        },
      ],
    );

  const convention = weightConventionLabels[current.weightConvention];

  let footerButton;
  if (nextIncomplete) {
    const number = current.sets.indexOf(nextIncomplete) + 1;
    footerButton = (
      <Button
        title={`Complete set ${number}`}
        icon={Check}
        onPress={() => toggle(nextIncomplete.id, false)}
        testID="complete-next-set"
      />
    );
  } else if (next) {
    footerButton = (
      <Button
        title="Next exercise"
        icon={ChevronRight}
        onPress={() => goTo(currentIndex + 1)}
        testID="footer-next-exercise"
      />
    );
  } else {
    footerButton = (
      <Button
        title="Finish workout"
        icon={Flag}
        onPress={finish}
        testID="footer-finish"
      />
    );
  }

  return (
    <Screen
      // A new exercise starts scrolled to the top.
      key={current.id}
      edges={['left', 'right', 'bottom']}
      testID="active-workout-screen"
      footer={
        <>
          <RestTimerCard
            timer={rest}
            onPause={() =>
              run(() =>
                workouts.updateRest(session.id, pauseRest).then(() => {}),
              )
            }
            onResume={() =>
              run(() =>
                workouts.updateRest(session.id, resumeRest).then(() => {}),
              )
            }
            onAdjust={delta =>
              run(() =>
                workouts
                  .updateRest(session.id, (timer, now) =>
                    adjustRest(timer, delta, now),
                  )
                  .then(() => {}),
              )
            }
            onSkip={() =>
              run(() =>
                workouts.updateRest(session.id, () => noRest).then(() => {}),
              )
            }
          />
          {footerButton}
        </>
      }
    >
      <View style={styles.progressRow}>
        <IconButton
          label="Previous exercise"
          icon={ChevronLeft}
          disabled={currentIndex === 0}
          onPress={() => goTo(currentIndex - 1)}
          testID="previous-exercise"
        />
        <View style={styles.progressText}>
          <AppText variant="bodyStrong" maxFontSizeMultiplier={1.6}>
            Exercise {currentIndex + 1} of {exercises.length}
          </AppText>
          <AppText
            variant="caption"
            tone="secondary"
            maxFontSizeMultiplier={1.6}
            accessibilityLabel={`${totals.done} of ${totals.total} sets done`}
          >
            {totals.done}/{totals.total} sets done
          </AppText>
        </View>
        <IconButton
          label="Next exercise"
          icon={ChevronRight}
          disabled={!next}
          onPress={() => goTo(currentIndex + 1)}
          testID="next-exercise"
        />
      </View>
      <View
        style={styles.track}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View
          style={[
            styles.fill,
            {
              width: `${
                totals.total ? (totals.done / totals.total) * 100 : 0
              }%`,
            },
          ]}
        />
      </View>

      <Card>
        <AppText variant="title" testID="current-exercise-name">
          {current.name}
        </AppText>
        <AppText tone="secondary">{targetText(current)}</AppText>
        {convention ? (
          <AppText variant="bodyStrong" tone="accent">
            {convention}
          </AppText>
        ) : null}
        <Button
          title="Watch demonstration"
          variant="secondary"
          icon={Play}
          accessibilityHint={`Shows how to do ${current.name}. Your workout stays as it is.`}
          // A sheet over the workout: nothing here is left or reset.
          onPress={() =>
            navigation.navigate('ExerciseDemo', {
              exerciseId: current.exerciseId,
            })
          }
          testID="watch-demo"
        />
      </Card>

      <Card>
        {previous.status === 'ready' && previous.data ? (
          <>
            <AppText variant="caption" tone="secondary">
              Last time ({shortDate(previous.data.trainingLocalDate)})
            </AppText>
            <AppText testID="previous-performance">
              {previous.data.sets
                .map(s =>
                  describeSet(
                    s,
                    current.trackingType,
                    current.weightConvention,
                    unit,
                  ),
                )
                .join(', ')}
            </AppText>
            {hasBlankIncomplete ? (
              <Button
                title="Use last time’s numbers"
                variant="ghost"
                icon={Copy}
                onPress={() =>
                  run(async () => {
                    if (previous.data) {
                      await workouts.copyPrevious(current.id, previous.data);
                    }
                  })
                }
                testID="copy-previous"
              />
            ) : null}
          </>
        ) : previous.status === 'ready' ? (
          <AppText tone="secondary">First time logging this exercise.</AppText>
        ) : null}

        <SetHeader
          trackingType={current.trackingType}
          weightConvention={current.weightConvention}
          unit={unit}
        />
        {current.sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            number={index + 1}
            trackingType={current.trackingType}
            weightConvention={current.weightConvention}
            unit={unit}
            onSave={values => {
              // Editing a set clears an old "Enter reps first" message.
              setRowErrors(errors => ({ ...errors, [set.id]: '' }));
              return workouts.updateSet(set.id, values);
            }}
            onToggle={() => toggle(set.id, set.completedAt !== null)}
            error={rowErrors[set.id] || null}
          />
        ))}
        <View style={styles.setActions}>
          <Button
            title="Add set"
            variant="ghost"
            icon={Plus}
            onPress={() => run(() => workouts.addSet(current.id))}
            testID="add-set"
          />
          {current.sets.length > 0 ? (
            <Button
              title="Remove last set"
              variant="ghost"
              icon={Trash2}
              onPress={() => {
                const last = current.sets[current.sets.length - 1];
                const remove = () => run(() => workouts.removeSet(last.id));
                if (last.completedAt) {
                  Alert.alert(
                    'Remove a completed set?',
                    'Its weight and reps will be deleted.',
                    [
                      { text: 'Keep it', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: remove },
                    ],
                  );
                } else {
                  remove();
                }
              }}
              testID="remove-set"
            />
          ) : null}
        </View>
      </Card>

      {next ? (
        <Card
          onPress={() => goTo(currentIndex + 1)}
          accessibilityLabel={`Next exercise: ${next.name}, ${next.sets.length} sets`}
          accessibilityHint="Goes to the next exercise"
          testID="next-exercise-card"
        >
          <View style={styles.nextRow}>
            <View style={styles.nextText}>
              <AppText variant="caption" tone="secondary">
                Next exercise
              </AppText>
              <AppText variant="bodyStrong">{next.name}</AppText>
              <AppText variant="caption" tone="secondary">
                {next.sets.length} sets
              </AppText>
            </View>
            <ChevronRight color={colors.textSecondary} size={20} />
          </View>
        </Card>
      ) : null}

      <Input
        label="Workout notes"
        placeholder="How did it feel?"
        value={notes}
        onChangeText={text => {
          setNotes(text);
          workouts.setNotes(session.id, text).catch(() => {});
        }}
        multiline
        maxLength={2000}
        testID="workout-notes"
      />

      <Button
        title="Finish workout"
        variant="secondary"
        icon={Flag}
        onPress={finish}
        testID="finish-workout"
      />
      <Button
        title="Discard workout"
        variant="ghost"
        icon={Trash2}
        accessibilityHint="Asks for confirmation before deleting"
        onPress={discard}
        testID="discard-workout"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    flex: 1,
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginTop: -spacing.sm,
  },
  fill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  setActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextText: {
    flex: 1,
  },
});
