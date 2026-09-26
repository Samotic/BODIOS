import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** e.g. "Muscle group filter", so VoiceOver explains what the chip does. */
  accessibilityHint?: string;
};

/** Rounded toggle used in filter rows. Selected = lime with dark text. */
export function FilterChip({
  label,
  selected,
  onPress,
  accessibilityHint,
}: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      // 40pt visible + 4pt above and below = 48pt touch target.
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="bodyStrong"
        tone={selected ? 'onAccent' : 'primary'}
        maxFontSizeMultiplier={1.6}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.8,
  },
});
