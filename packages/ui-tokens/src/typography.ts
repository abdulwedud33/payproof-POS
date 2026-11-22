/**
 * Typography Tokens from DESIGN.md
 * One family for everything: IBM Plex Sans with tabular figures on.
 */

export const fontFamilies = {
  sans: 'IBM Plex Sans, Noto Sans, system-ui, sans-serif',
  ethiopic: 'Noto Sans Ethiopic, system-ui, sans-serif',
  mono: 'IBM Plex Mono, monospace',
} as const;

export const typographyScale = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  figure: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  total: { fontSize: 48, lineHeight: 56, fontWeight: '600' },
  verdict: { fontSize: 72, lineHeight: 80, fontWeight: '700' },
} as const;
