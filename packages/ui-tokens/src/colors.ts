/**
 * PayProof POS Color Tokens from DESIGN.md
 */

export const referenceColors = {
  // Ground
  ground50: '#F5F7F6',
  ground0: '#FFFFFF',
  ground100: '#EBEFED',
  line200: '#D3DBD8',

  // Ink
  ink900: '#1D2B28',
  ink600: '#5B6B67',

  // Ledger (Verified & Primary Action)
  ledger700: '#085E47',
  ledger600: '#0B7A5C',
  ledger100: '#D9F0E7',

  // Amber (Waiting)
  amber800: '#7A4800',
  amber500: '#E0A21B',
  amber100: '#FFF1D6',

  // Red (Rejected & Destructive)
  red800: '#8E1B15',
  red700: '#B3261E',
  red100: '#FBE3E0',

  // Steel (Info & Links)
  steel900: '#1F4A74',
  steel700: '#2F5D8A',
  steel100: '#E1ECF6',
} as const;

export const lightSemanticColors = {
  bgApp: referenceColors.ground50,
  bgSurface: referenceColors.ground0,
  bgSunken: referenceColors.ground100,
  borderDefault: referenceColors.line200,

  textPrimary: referenceColors.ink900,
  textSecondary: referenceColors.ink600,

  actionPrimary: referenceColors.ledger600,
  actionPrimaryPressed: referenceColors.ledger700,
  actionPrimaryText: referenceColors.ground0,

  statusVerifiedBg: referenceColors.ledger600,
  statusVerifiedTint: referenceColors.ledger100,
  statusVerifiedText: referenceColors.ledger700,

  statusWaitingBg: referenceColors.amber500,
  statusWaitingTint: referenceColors.amber100,
  statusWaitingText: referenceColors.amber800,

  statusRejectedBg: referenceColors.red700,
  statusRejectedTint: referenceColors.red100,
  statusRejectedText: referenceColors.red800,

  statusInfoTint: referenceColors.steel100,
  statusInfoText: referenceColors.steel900,

  focusRing: referenceColors.steel700,
} as const;

export const darkSemanticColors = {
  bgApp: '#10201C',
  bgSurface: '#182A25',
  bgSunken: '#0E1A17',
  borderDefault: '#284039',

  textPrimary: '#E8F1EE',
  textSecondary: '#9CB0AA',

  actionPrimary: '#4FD1A5',
  actionPrimaryPressed: '#3CB08A',
  actionPrimaryText: '#10201C',

  statusVerifiedBg: '#0B7A5C',
  statusVerifiedTint: '#133B2F',
  statusVerifiedText: '#4FD1A5',

  statusWaitingBg: '#E0A21B',
  statusWaitingTint: '#3D2D0C',
  statusWaitingText: '#F4C056',

  statusRejectedBg: '#B3261E',
  statusRejectedTint: '#3B1513',
  statusRejectedText: '#F87171',

  statusInfoTint: '#172C40',
  statusInfoText: '#60A5FA',

  focusRing: '#4FD1A5',
} as const;
