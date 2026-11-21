---
trigger: glob
globs: "apps/cashier-app/**, apps/owner-web/**, packages/ui-tokens/**"
description: "Any user interface work: screens, components, loading, errors, onboarding, copy."
---

# UI and UX rules

Tokens, components, voice: @../../DESIGN.md. Reasoning and screens: @../../docs/04-uiux-design-brief.md.

1. Use tokens from `packages/ui-tokens`. No raw hex values or magic spacing.
2. **No spinners where the layout is known.** Use a skeleton that matches the real layout. Skeletons are used across the whole app.
3. **Every tap responds instantly** (pressed state and haptic within 100 ms), even if the real work takes longer. Use optimistic updates and roll back with a clear message on failure.
4. **Exception: never show a payment as Verified until the server decides.** The verdict screen may appear instantly as a skeleton shell.
5. **Nothing moves during onboarding.** Reserve space for every element, fix the primary button position, and avoid layout shift.
6. **Never show backend errors.** Map error codes to friendly text from the translation files, with a short reference code for unknown errors.
7. Apply the UX laws (Jakob, Hick, proximity, Miller, Von Restorff), smart defaults, goal gradient, reciprocity, endowment, and loss aversion as DESIGN.md describes, honestly and without dark patterns.
8. Simplicity, consistency, visual hierarchy: one primary action per screen, the same word for the same thing, the most important number largest.
9. Every state has an icon and a word as well as color. Touch targets 48 px or more. Text through the translation layer. Contrast meets WCAG 2.2 AA.
10. Every screen has loading (skeleton), empty, error, offline, and success states.
