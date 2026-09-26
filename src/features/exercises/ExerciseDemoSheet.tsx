import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Card, EmptyState, Screen } from '../../components';
import { useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { DraftContentNote } from './ExerciseDetailScreen';
import { ExerciseDemo } from './ExerciseDemo';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseDemo'>;

/**
 * "Watch demonstration" during a workout. A sheet over the workout rather
 * than a new page: the workout screen stays exactly as it was underneath
 * (typed numbers, rest timer), and closing the sheet stops the video.
 */
export function ExerciseDemoSheet({ route }: Props) {
  const { exercises } = useRepositories();
  const { exerciseId } = route.params;
  const result = useAsyncData(async () => {
    const exercise = await exercises.getById(exerciseId);
    const media = exercise ? await exercises.getApprovedMedia(exercise) : null;
    return { exercise, media };
  }, [exercises, exerciseId]);

  if (result.status === 'loading') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Loading demonstration"
        />
      </Screen>
    );
  }

  if (result.status === 'error' || !result.data.exercise) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={TriangleAlert}
          title="Couldn’t load this demonstration"
          message={
            result.status === 'error'
              ? result.error.message
              : 'This exercise isn’t in the library on this phone.'
          }
          action={
            result.status === 'error'
              ? { title: 'Try again', onPress: result.reload }
              : undefined
          }
        />
      </Screen>
    );
  }

  const { exercise, media } = result.data;
  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      testID={`demo-sheet-${exercise.id}`}
    >
      <AppText variant="title">{exercise.name}</AppText>
      <ExerciseDemo media={media} title={exercise.name} />

      <Card>
        <AppText variant="heading">How to perform</AppText>
        {exercise.instructions.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNumber}>
              <AppText
                variant="bodyStrong"
                tone="onAccent"
                maxFontSizeMultiplier={1.4}
              >
                {index + 1}
              </AppText>
            </View>
            <AppText style={styles.flex}>{step}</AppText>
          </View>
        ))}
      </Card>

      {exercise.contentReviewStatus === 'draft' ? (
        <DraftContentNote hasVideo={media !== null} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + spacing.xs,
  },
  stepNumber: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
});
