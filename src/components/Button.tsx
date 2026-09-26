import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radii, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/**
 * Primary buttons are electric lime with dark text (roadmap rule); secondary
 * buttons sit on the raised surface. Every button is at least 48pt tall.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const foreground = variant === 'primary' ? colors.onAccent : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {Icon ? <Icon color={foreground} size={20} strokeWidth={2.25} /> : null}
      <AppText
        variant="bodyStrong"
        // Controls grow with text size, but less than body text, so a big
        // button can't crowd out the content (e.g. above the keyboard).
        maxFontSizeMultiplier={1.6}
        style={[styles.label, { color: foreground }]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    textAlign: 'center',
    flexShrink: 1,
  },
});
