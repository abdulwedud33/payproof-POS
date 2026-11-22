import { referenceColors, lightSemanticColors } from './colors.js';
import { radii, spacingScale } from './spacing.js';

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        ...referenceColors,
        app: {
          bg: lightSemanticColors.bgApp,
          surface: lightSemanticColors.bgSurface,
          sunken: lightSemanticColors.bgSunken,
          border: lightSemanticColors.borderDefault,
          text: lightSemanticColors.textPrimary,
          'text-secondary': lightSemanticColors.textSecondary,
        },
        action: {
          primary: lightSemanticColors.actionPrimary,
          'primary-pressed': lightSemanticColors.actionPrimaryPressed,
          'primary-text': lightSemanticColors.actionPrimaryText,
        },
        status: {
          'verified-bg': lightSemanticColors.statusVerifiedBg,
          'verified-tint': lightSemanticColors.statusVerifiedTint,
          'verified-text': lightSemanticColors.statusVerifiedText,
          'waiting-bg': lightSemanticColors.statusWaitingBg,
          'waiting-tint': lightSemanticColors.statusWaitingTint,
          'waiting-text': lightSemanticColors.statusWaitingText,
          'rejected-bg': lightSemanticColors.statusRejectedBg,
          'rejected-tint': lightSemanticColors.statusRejectedTint,
          'rejected-text': lightSemanticColors.statusRejectedText,
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Noto Sans', 'system-ui', 'sans-serif'],
        ethiopic: ['"Noto Sans Ethiopic"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        input: `${radii.input}px`,
        card: `${radii.card}px`,
        sheet: `${radii.sheet}px`,
        chip: `${radii.chip}px`,
      },
      spacing: {
        1: `${spacingScale[1]}px`,
        2: `${spacingScale[2]}px`,
        3: `${spacingScale[3]}px`,
        4: `${spacingScale[4]}px`,
        6: `${spacingScale[6]}px`,
        8: `${spacingScale[8]}px`,
        12: `${spacingScale[12]}px`,
        16: `${spacingScale[16]}px`,
      },
    },
  },
};
