import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, radii, spacing } from '../../theme';
import { equipmentLabels, muscleLabels } from './labels';
import type { Exercise } from './types';

type Props = {
  exercise: Exercise;
  onPress: (exercise: Exercise) => void;
};

/**
 * One row in the exercise library. The thumbnail is a plain icon until an
 * approved, exercise-specific poster exists (Stage 3).
 */
function ExerciseListItemBase({ exercise, onPress }: Props) {
  const equipment = exercise.equipment.map(e => equipmentLabels[e]).join(' · ');
  const muscles = exercise.primaryMuscles.map(m => muscleLabels[m]).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}. ${equipment}. ${muscles}.`}
      accessibilityHint="Opens exercise details"
      onPress={() => onPress(exercise)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`exercise-row-${exercise.id}`}
    >
      <View style={styles.thumbnail}>
        <Dumbbell color={colors.textSecondary} size={26} strokeWidth={1.75} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" style={styles.name}>
          {exercise.name}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {equipment}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {muscles}
        </AppText>
      </View>
      <ChevronRight color={colors.textSecondary} size={20} />
    </Pressable>
  );
}

/** Memoised so typing in search doesn't re-render unchanged rows. */
export const ExerciseListItem = memo(ExerciseListItemBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
  },
});
