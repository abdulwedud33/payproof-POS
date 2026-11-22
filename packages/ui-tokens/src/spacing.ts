/**
 * Spacing, Shape, and Motion Tokens from DESIGN.md
 */

export const spacingScale = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const radii = {
  input: 8,
  card: 12,
  sheet: 20,
  chip: 999,
} as const;

export const motion = {
  instant: 80, // Press feedback
  quick: 160, // Chips, toggles
  standard: 240, // Navigation, bottom sheets
  verdict: 320, // Signature verdict reveal
} as const;
