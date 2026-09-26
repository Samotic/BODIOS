import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, touchTarget } from '../theme';
import { AppText } from './AppText';

export type IconButtonProps = {
  /** Spoken by VoiceOver; there's no visible text. */
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  /** Short text instead of an icon, e.g. "0.5×". */
  text?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  testID?: string;
};

/** Round 48pt button for compact controls (video player, steppers). */
export function IconButton({
  label,
  onPress,
  icon: Icon,
  text,
  accessibilityHint,
  disabled = false,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {Icon ? <Icon color={colors.text} size={22} strokeWidth={2} /> : null}
      {text ? (
        <AppText variant="bodyStrong" maxFontSizeMultiplier={1.3}>
          {text}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.35,
  },
});
