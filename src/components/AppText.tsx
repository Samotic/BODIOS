import { Text, type TextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from '../theme';

const toneColors = {
  primary: colors.text,
  secondary: colors.textSecondary,
  accent: colors.accent,
  onAccent: colors.onAccent,
  danger: colors.danger,
} as const;

export type TextTone = keyof typeof toneColors;

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
};

const headingVariants: ReadonlySet<TypographyVariant> = new Set([
  'display',
  'title',
  'heading',
]);

/**
 * How far each size may grow with the user's text size setting. Body text
 * grows fully; big titles grow less, as in iOS's own apps, so a 34pt title
 * doesn't break mid-word or push the whole screen off the bottom.
 */
const maxScale: Partial<Record<TypographyVariant, number>> = {
  wordmark: 1.3,
  display: 1.5,
  title: 1.7,
  heading: 2,
};

/**
 * The only Text component screens should use. Title-sized variants are
 * announced as headings by VoiceOver so users can jump between sections.
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  accessibilityRole,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  return (
    <Text
      accessibilityRole={
        accessibilityRole ??
        (headingVariants.has(variant) ? 'header' : undefined)
      }
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxScale[variant]}
      style={[typography[variant], { color: toneColors[tone] }, style]}
      {...rest}
    />
  );
}
