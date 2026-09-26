import { DarkTheme, type Theme } from '@react-navigation/native';
import { colors } from './tokens';

/** React Navigation theme so headers, tab bar and screen backgrounds match Bodios. */
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};
