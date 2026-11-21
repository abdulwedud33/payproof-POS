---
name: build-screen
description: Build a screen or component in the cashier app or owner web dashboard following DESIGN.md, with skeleton loading, instant feedback, all states, and friendly errors. Use for any UI work.
---

# Build a screen

Input: the screen name from `docs/03-app-flow.md` and its requirement IDs.

## Steps

1. Read `DESIGN.md`, `docs/04-uiux-design-brief.md` (the screen's spec and wireframe), and `docs/03-app-flow.md`.
2. Use tokens and components from `packages/ui-tokens` and the design system. No raw values.
3. **Skeleton first.** Build a skeleton that matches the real layout and use it wherever content is loading. No spinners where the layout is known.
4. **Instant feedback.** Pressed state and haptic within 100 ms. Update optimistically and roll back with a clear message. For payment verdicts, show the shell and skeleton instantly but never show Verified until the server decides.
5. **Layout stability.** Reserve space for all content. In onboarding, no element or button moves. Measure layout shift and aim for none.
6. Build every state: loading (skeleton), empty, error, offline, success.
7. **Errors for people.** Map error codes to friendly text from translation files. Never show server messages, stack traces, or raw codes except a short reference code for unknown errors.
8. Apply the UX laws and psychology notes in `DESIGN.md` where they fit: Jakob, Hick, proximity, Miller, Von Restorff, smart defaults, goal gradient, reciprocity, endowment, loss aversion. Be honest: no fake urgency or invented numbers.
9. Simplicity and hierarchy: one primary action, the key number largest, same words for the same things.
10. Accessibility: contrast, 48 px targets, labels for screen readers, reduced motion respected, icon plus word plus color.
11. Tests: a render test per state, and a check that tokens are used. Capture screenshots of each state for the walkthrough.
