import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../theme';
import { AppText } from './AppText';

export type InputProps = TextInputProps & {
  /** Visible label, also used as the VoiceOver label. */
  label: string;
  /** Shown under the field in text, so errors never rely on colour alone. */
  error?: string;
};

export function Input({ label, error, style, multiline, ...rest }: InputProps) {
  return (
    <View style={styles.field}>
      {/* The TextInput carries the label for VoiceOver, so hide this copy. */}
      <AppText
        variant="caption"
        tone="secondary"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        keyboardAppearance="dark"
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          error ? styles.inputError : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText
          variant="caption"
          tone="danger"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: touchTarget,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  multiline: {
    minHeight: touchTarget * 2,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
});
