import { contrastRatio } from '../src/theme/contrast';
import { colors } from '../src/theme/tokens';

// WCAG AA for normal-size text is 4.5:1.
const AA = 4.5;

describe('theme contrast', () => {
  test.each([
    ['main text on background', colors.text, colors.background],
    ['main text on surface', colors.text, colors.surface],
    ['secondary text on background', colors.textSecondary, colors.background],
    ['secondary text on surface', colors.textSecondary, colors.surface],
    [
      'secondary text on raised surface',
      colors.textSecondary,
      colors.surfaceRaised,
    ],
    ['dark text on lime buttons', colors.onAccent, colors.accent],
    ['lime text on background', colors.accent, colors.background],
    ['error text on background', colors.danger, colors.background],
  ])('%s meets AA', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });

  test('matches known reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
