import { describe, it, expect } from 'vitest';
import { referenceColors, lightSemanticColors, typographyScale, radii, motion } from './index.js';

describe('packages/ui-tokens', () => {
  it('exports valid hex colors', () => {
    for (const [name, hex] of Object.entries(referenceColors)) {
      expect(hex, `Invalid hex for ${name}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('matches semantic token mappings from DESIGN.md', () => {
    expect(lightSemanticColors.bgApp).toBe('#F5F7F6');
    expect(lightSemanticColors.actionPrimary).toBe('#0B7A5C');
    expect(lightSemanticColors.statusVerifiedBg).toBe('#0B7A5C');
    expect(lightSemanticColors.statusWaitingBg).toBe('#E0A21B');
    expect(lightSemanticColors.statusRejectedBg).toBe('#B3261E');
  });

  it('provides the complete typography and spacing scales', () => {
    expect(typographyScale.total.fontSize).toBe(48);
    expect(typographyScale.verdict.fontSize).toBe(72);
    expect(radii.card).toBe(12);
    expect(radii.sheet).toBe(20);
    expect(motion.instant).toBe(80);
    expect(motion.verdict).toBe(320);
  });
});
