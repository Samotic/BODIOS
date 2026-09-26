import { Search } from 'lucide-react-native';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../theme';

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Read by VoiceOver; the placeholder alone isn't a label. */
  accessibilityLabel: string;
  testID?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
}: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <Search color={colors.textSecondary} size={20} strokeWidth={2} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        keyboardAppearance="dark"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.input}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingLeft: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    minHeight: touchTarget,
    paddingRight: spacing.md,
  },
});
