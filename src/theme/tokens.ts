/**
 * Bodios design tokens.
 *
 * The five base colours come from the roadmap ("Screens and behavior"):
 * background, surface, accent, text and textSecondary. The others are
 * derived shades for inputs, dividers and errors so they stay readable on
 * the dark surfaces. Contrast for the main pairs is checked in
 * __tests__/contrast.test.ts.
 */
export const colors = {
  background: '#0B0D0C',
  surface: '#171A18',
  surfaceRaised: '#212522',
  border: '#2C312D',
  accent: '#BEFA57',
  onAccent: '#0B0D0C',
  text: '#F5F7F4',
  textSecondary: '#A8AFA9',
  danger: '#FF8A7A',
} as const;

/** 8-point spacing scale (xs is the half step for tight gaps). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Horizontal padding for every screen. */
export const screenPadding = 20;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

/** Minimum size of anything tappable (roadmap product target). */
export const touchTarget = 48;
