import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../components';
import { touchTarget } from '../theme';

/**
 * "Cancel" (or "Done") for modal sheets. Swiping the sheet down also closes
 * it; this gives VoiceOver and one-handed users an obvious button too.
 */
export function HeaderCancelButton({
  label = 'Cancel',
  testID = 'modal-cancel',
}: {
  label?: string;
  testID?: string;
}) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.goBack()}
      hitSlop={8}
      style={styles.button}
      testID={testID}
    >
      <AppText
        variant="bodyStrong"
        tone="accent"
        // The navigation bar doesn't grow, so the label can't grow much.
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget - 4,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
