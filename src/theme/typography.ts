import type { TextStyle } from 'react-native';

/**
 * Text styles built on the iOS system font (SF Pro), so no font files need to
 * be bundled. Sizes scale with the user's Dynamic Type setting because
 * <Text> keeps allowFontScaling on by default.
 */
export const typography = {
  wordmark: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
