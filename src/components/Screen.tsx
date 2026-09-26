import type { ReactNode } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { colors, screenPadding, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

export type ScreenProps = {
  children: ReactNode;
  /**
   * Which edges to pad for the notch/Dynamic Island and home indicator.
   * Tab screens (no header, tab bar below): top. Stack screens (native
   * header above): bottom.
   */
  edges?: Edge[];
  /** Turn off for screens that manage their own scrolling list. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Pinned below the scrolling content, above the home indicator. While the
   * keyboard is open it rides above the keyboard, with a Done button to
   * close it (number pads have no return key).
   */
  footer?: ReactNode;
  testID?: string;
};

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  scroll = true,
  contentStyle,
  footer,
  testID,
}: ScreenProps) {
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const keyboardOpen = keyboardHeight > 0;
  // The safe area already pads the home-indicator part of the keyboard.
  const liftFooter = keyboardOpen
    ? Math.max(
        0,
        keyboardHeight - (edges.includes('bottom') ? insets.bottom : 0),
      )
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          // Keeps focused inputs above the keyboard on iOS.
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>
          {children}
        </View>
      )}
      {footer ? (
        <View style={[styles.footer, { marginBottom: liftFooter }]}>
          {keyboardOpen ? (
            <View style={styles.doneRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done, hide keyboard"
                onPress={() => Keyboard.dismiss()}
                hitSlop={8}
                style={styles.done}
                testID="keyboard-done"
              >
                <AppText
                  variant="bodyStrong"
                  tone="accent"
                  maxFontSizeMultiplier={1.6}
                >
                  Done
                </AppText>
              </Pressable>
            </View>
          ) : null}
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  fill: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: -spacing.xs,
  },
  done: {
    minHeight: touchTarget - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
