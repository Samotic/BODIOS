import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CircleCheck,
  Dumbbell,
  Info,
  Plus,
  SearchX,
  Target,
  TriangleAlert,
} from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Screen,
  Tag,
} from '../../components';
import { useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { ExerciseDemo } from './ExerciseDemo';
import {
  equipmentLabels,
  muscleLabels,
  weightConventionLabels,
} from './labels';
import type { Exercise, ExerciseMedia } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route, navigation }: Props) {
  const { exercises } = useRepositories();
  const { exerciseId, addedToRoutine } = route.params;
  const result = useAsyncData(async () => {
    const exercise = await exercises.getById(exerciseId);
    const media = exercise ? await exercises.getApprovedMedia(exercise) : null;
    return { exercise, media };
  }, [exercises, exerciseId]);

  let body;
  if (result.status === 'loading') {
    body = (
      <ActivityIndicator
        color={colors.accent}
        accessibilityLabel="Loading exercise"
      />
    );
  } else if (result.status === 'error') {
    body = (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn’t load this exercise"
        message={result.error.message}
        action={{ title: 'Try again', onPress: result.reload }}
      />
    );
  } else if (!result.data.exercise) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Exercise not found"
        message="This exercise isn’t in the library on this phone."
        action={{ title: 'Go back', onPress: () => navigation.goBack() }}
      />
    );
  } else {
    body = (
      <ExerciseDetails
        exercise={result.data.exercise}
        media={result.data.media}
        onShowCredits={() => navigation.navigate('MediaCredits')}
      />
    );
  }

  const found = result.status === 'ready' && result.data.exercise !== null;

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      testID={`exercise-detail-${exerciseId}`}
      footer={
        found ? (
          <Button
            title="Add to routine"
            icon={Plus}
            onPress={() => navigation.navigate('RoutinePicker', { exerciseId })}
            testID="add-to-routine"
          />
        ) : undefined
      }
    >
      {addedToRoutine ? (
        <Card testID="added-to-routine">
          <View style={styles.step}>
            <CircleCheck color={colors.accent} size={20} />
            <AppText style={styles.flex} accessibilityLiveRegion="polite">
              Added to {addedToRoutine}
            </AppText>
          </View>
        </Card>
      ) : null}
      {body}
    </Screen>
  );
}

function trackingSummary(exercise: Exercise): string {
  switch (exercise.trackingType) {
    case 'weight_reps':
      return `${
        weightConventionLabels[exercise.weightConvention] ?? 'Weight'
      } and reps`;
    case 'reps':
      return 'Reps only';
    case 'duration':
      return 'Time held';
  }
}

function ExerciseDetails({
  exercise,
  media,
  onShowCredits,
}: {
  exercise: Exercise;
  media: ExerciseMedia | null;
  onShowCredits: () => void;
}) {
  return (
    <>
      <View style={styles.titleBlock}>
        <AppText variant="display">{exercise.name}</AppText>
        {exercise.aliases.length > 0 ? (
          <AppText tone="secondary">
            Also called {exercise.aliases.join(', ')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.tags}>
        {exercise.primaryMuscles.map(m => (
          <Tag key={m} label={muscleLabels[m]} icon={Target} />
        ))}
        {exercise.equipment.map(e => (
          <Tag key={e} label={equipmentLabels[e]} icon={Dumbbell} />
        ))}
      </View>

      <ExerciseDemo
        media={media}
        title={exercise.name}
        onShowCredits={onShowCredits}
      />

      <Card>
        <AppText variant="label" tone="secondary">
          How it’s logged
        </AppText>
        <AppText variant="bodyStrong">{trackingSummary(exercise)}</AppText>
        {exercise.secondaryMuscles.length > 0 ? (
          <AppText tone="secondary">
            Also works{' '}
            {exercise.secondaryMuscles
              .map(m => muscleLabels[m].toLowerCase())
              .join(', ')}
          </AppText>
        ) : null}
      </Card>

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

      {exercise.mistakes.length > 0 ? (
        <Card>
          <AppText variant="heading">Common mistakes</AppText>
          {exercise.mistakes.map(mistake => (
            <View key={mistake} style={styles.step}>
              <AppText
                tone="accent"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                •
              </AppText>
              <AppText style={styles.flex}>{mistake}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {exercise.contentReviewStatus === 'draft' ? (
        <DraftContentNote hasVideo={media !== null} />
      ) : null}
    </>
  );
}

/** Instructions and demo technique await a qualified trainer's review. */
export function DraftContentNote({ hasVideo }: { hasVideo: boolean }) {
  return (
    <Card style={styles.reviewNote} testID="draft-content-note">
      <View style={styles.step}>
        <Info color={colors.textSecondary} size={20} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">
            {hasVideo ? 'Draft instructions and video' : 'Draft instructions'}
          </AppText>
          <AppText tone="secondary">
            {hasVideo
              ? 'The steps and the technique in the video haven’t been reviewed by a qualified trainer yet. Stop if anything hurts.'
              : 'Not yet reviewed by a qualified trainer. Stop if anything hurts.'}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  reviewNote: {
    backgroundColor: colors.background,
  },
});
