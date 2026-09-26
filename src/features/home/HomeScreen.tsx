import { useNavigation } from '@react-navigation/native';
import { Dumbbell, Play } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen } from '../../components';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatDuration } from '../../lib/dates';
import { spacing } from '../../theme';
import { periodFor } from '../progress/periods';
import { periodStats } from '../progress/metrics';
import { RoutineList } from '../routines/RoutineList';
import { WeekStrip } from './WeekStrip';

export function HomeScreen() {
  const navigation = useNavigation();
  const { routines, workouts, history } = useRepositories();
  const version = useDataVersion();
  const saved = useAsyncData(() => routines.list(), [routines], version);
  // Only real, finished workouts count; nothing here is a sample number.
  const done = useAsyncData(() => history.listWorkouts(), [history], version);
  const week = useMemo(() => periodFor('week', new Date(), 0), []);
  const finished = useMemo(
    () => (done.status === 'ready' ? done.data : []),
    [done.status, done.data],
  );
  const thisWeek = periodStats(finished, week);
  const activeDates = useMemo(
    () => new Set(finished.map(w => w.trainingLocalDate)),
    [finished],
  );
  // A workout in progress is in the database, so it's still here after the
  // app was closed or force-quit.
  const active = useAsyncData(
    async () => {
      const id = await workouts.getActiveSessionId();
      return id ? workouts.getSession(id) : null;
    },
    [workouts],
    version,
  );
  const draft = active.status === 'ready' ? active.data : null;

  return (
    <Screen testID="home-screen">
      <AppText
        variant="wordmark"
        accessibilityRole="header"
        accessibilityLabel="Bodios"
      >
        BODIOS
      </AppText>
      <AppText variant="display">Let’s get stronger.</AppText>
      <WeekStrip today={new Date()} activeDates={activeDates} />

      {finished.length > 0 ? (
        <View style={styles.tiles}>
          <Card style={styles.tile}>
            <AppText variant="title" testID="home-week-workouts">
              {thisWeek.workouts}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {thisWeek.workouts === 1 ? 'Workout' : 'Workouts'} this week
            </AppText>
          </Card>
          <Card style={styles.tile}>
            <AppText variant="title" testID="home-week-time">
              {thisWeek.totalDurationMs > 0
                ? formatDuration(thisWeek.totalDurationMs)
                : '0 min'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              Trained this week
            </AppText>
          </Card>
        </View>
      ) : null}

      {draft ? (
        <Card>
          <AppText variant="label" tone="accent">
            Workout in progress
          </AppText>
          <AppText tone="secondary">
            {draft.routineName ? `${draft.routineName} · ` : ''}Started at{' '}
            {new Date(draft.startedAt).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </AppText>
          <Button
            title="Resume workout"
            icon={Play}
            onPress={() =>
              navigation.navigate('ActiveWorkout', { sessionId: draft.id })
            }
            testID="resume-workout"
          />
        </Card>
      ) : null}

      {saved.status === 'ready' && saved.data.length > 0 ? (
        <>
          <AppText variant="heading">Your routines</AppText>
          <RoutineList
            routines={saved.data}
            onOpen={routine =>
              navigation.navigate('RoutineEditor', { routineId: routine.id })
            }
          />
        </>
      ) : saved.status === 'ready' ? (
        <EmptyState
          icon={Dumbbell}
          title="No routines yet"
          message="Browse the exercise library, then build a routine to start your first workout."
          action={{
            title: 'Browse exercises',
            onPress: () => navigation.navigate('Tabs', { screen: 'Workouts' }),
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
  },
});
