import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, radii, spacing } from '../../theme';
import type { RoutineSummary } from './types';

type Props = {
  routines: RoutineSummary[];
  onOpen: (routine: RoutineSummary) => void;
};

export function exerciseCountLabel(count: number): string {
  return count === 1 ? '1 exercise' : `${count} exercises`;
}

/** Saved routines as tappable rows (used on Home and the Workouts tab). */
export function RoutineList({ routines, onOpen }: Props) {
  return (
    <View style={styles.list}>
      {routines.map(routine => (
        <Pressable
          key={routine.id}
          accessibilityRole="button"
          accessibilityLabel={`${routine.name}, ${exerciseCountLabel(
            routine.exerciseCount,
          )}`}
          accessibilityHint="Opens the routine"
          onPress={() => onOpen(routine)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          testID={`routine-row-${routine.name}`}
        >
          <View style={styles.text}>
            <AppText variant="bodyStrong" style={styles.name}>
              {routine.name}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {exerciseCountLabel(routine.exerciseCount)}
            </AppText>
          </View>
          <ChevronRight color={colors.textSecondary} size={20} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
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
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
  },
});
