# DESIGN.md

The design system for PayProof POS. Components must use these tokens and never raw values. Read [docs/04-uiux-design-brief.md](docs/04-uiux-design-brief.md) for the reasoning behind them.

## 1. Identity

**Subject:** a supermarket checkout counter, where payment trust is the problem.
**Feel:** calm, exact, trustworthy. A well-kept ledger, not a flashy fintech app.
**The one loud thing:** the verdict screen. Everything else stays quiet.

## 2. Color

### Reference palette

| Token | Hex | Role |
|---|---|---|
| `ground-50` | `#F5F7F6` | App background |
| `ground-0` | `#FFFFFF` | Cards, sheets, inputs |
| `ground-100` | `#EBEFED` | Sunken areas, table stripes |
| `line-200` | `#D3DBD8` | Borders, dividers |
| `ink-900` | `#1D2B28` | Primary text |
| `ink-600` | `#5B6B67` | Secondary text |
| `ledger-700` | `#085E47` | Pressed green, text on tint |
| `ledger-600` | `#0B7A5C` | Primary action, verified |
| `ledger-100` | `#D9F0E7` | Verified tint |
| `amber-800` | `#7A4800` | Waiting text |
| `amber-500` | `#E0A21B` | Waiting accent and fill |
| `amber-100` | `#FFF1D6` | Waiting tint |
| `red-700` | `#B3261E` | Rejected, destructive |
| `red-800` | `#8E1B15` | Rejected text on tint |
| `red-100` | `#FBE3E0` | Rejected tint |
| `steel-700` | `#2F5D8A` | Information, links |
| `steel-900` | `#1F4A74` | Information text on tint |
| `steel-100` | `#E1ECF6` | Information tint |

### Semantic tokens (light)

| Token | Value | Use |
|---|---|---|
| `color-bg-app` | `ground-50` | Screen background |
| `color-bg-surface` | `ground-0` | Cards and panels |
| `color-bg-sunken` | `ground-100` | Inset areas |
| `color-border-default` | `line-200` | Borders |
| `color-text-primary` | `ink-900` | Body and headings |
| `color-text-secondary` | `ink-600` | Captions and hints |
| `color-action-primary` | `ledger-600` | Main buttons |
| `color-action-primary-pressed` | `ledger-700` | Pressed state |
| `color-action-primary-text` | `ground-0` | Text on main buttons |
| `color-status-verified-bg` | `ledger-600` | Verdict fill |
| `color-status-verified-tint` | `ledger-100` | Inline verified chips |
| `color-status-waiting-bg` | `amber-500` | Verdict fill (dark text on it) |
| `color-status-waiting-tint` | `amber-100` | Inline waiting chips |
| `color-status-rejected-bg` | `red-700` | Verdict fill |
| `color-status-rejected-tint` | `red-100` | Inline rejected chips |
| `color-status-info-tint` | `steel-100` | Info banners |
| `color-focus-ring` | `steel-700` | Keyboard and switch focus |

### Contrast, checked

| Pair | Ratio |
|---|---|
| `ink-900` on `ground-50` | 13.7 : 1 |
| `ink-600` on `ground-50` | 5.2 : 1 |
| `ledger-600` on white (and white on it) | 5.3 : 1 |
| `ledger-700` on `ledger-100` | 6.5 : 1 |
| `amber-800` on `amber-100` | 6.8 : 1 |
| `red-800` on `red-100` | 7.4 : 1 |
| White on `red-700` | 6.5 : 1 |
| `steel-900` on `steel-100` | 7.7 : 1 |

Waiting uses **dark text** on `amber-500`, not white. Re-check any new pair with a contrast tool before adding it.

### Dark theme (owner dashboard; optional for cashier)

| Token | Value |
|---|---|
| `color-bg-app` | `#10201C` |
| `color-bg-surface` | `#182A25` |
| `color-text-primary` | `#E8F1EE` (14.7 : 1 on bg) |
| `color-action-primary` | `#4FD1A5` with dark text (8.8 : 1) |

### Color rules

- Color never carries meaning alone. Verified, Waiting, and Rejected always pair with an icon and a word.
- No gradients and no decorative color washes.
- Green is reserved for verification and primary actions. Do not use it for decoration.
- Red is reserved for rejection and destructive actions.

## 3. Typography

| Role | Family | Fallback |
|---|---|---|
| Interface and numbers | **IBM Plex Sans** (tabular figures on) | Noto Sans, system-ui |
| Ethiopic script | **Noto Sans Ethiopic** | System Ethiopic font |

One family for everything. Use tabular figures (`font-variant-numeric: tabular-nums`, or the platform equivalent) for every number so columns and totals stay aligned.

### Scale

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `type-caption` | 12 / 16 | 400 | Captions, timestamps (never for essential info) |
| `type-body-sm` | 14 / 20 | 400 | Table cells, secondary text |
| `type-body` | 16 / 24 | 400 | Default body |
| `type-label` | 14 / 20 | 600 | Buttons, field labels |
| `type-title` | 20 / 28 | 600 | Section titles |
| `type-heading` | 24 / 32 | 600 | Screen titles |
| `type-figure` | 32 / 40 | 600 | Dashboard numbers |
| `type-total` | 48 / 56 | 600 | Cart total on the Charge screen |
| `type-verdict` | 72 / 80 | 700 | Amount on the verdict screen |

Rules:
- Body line length stays under about 70 characters on web.
- Sentence case everywhere. No all-caps labels and no tracked-out eyebrow text.
- Currency follows the amount in a smaller weight: `318.00 Birr`.
- Never truncate a money value. Reduce font size before cropping.

## 4. Spacing, shape, depth

| Token | Value |
|---|---|
| Space scale | 4, 8, 12, 16, 24, 32, 48, 64 (4-point grid) |
| `radius-input` | 8 |
| `radius-card` | 12 |
| `radius-sheet` | 20 (top corners only) |
| `radius-chip` | 999 |
| `border-default` | 1 px `color-border-default` |
| `elevation-sheet` | One shadow only, for bottom sheets and menus: `0 -4 16 rgba(29,43,40,0.12)` |

Rules:
- Different shapes for different jobs. Do not apply one radius everywhere.
- Prefer borders and tonal surfaces to shadows. Cards in lists have no shadow.
- Touch targets are at least 48 px. Primary actions on the cashier app are 56 to 64 px tall.

## 5. Motion

| Token | Duration | Curve | Use |
|---|---|---|---|
| `motion-instant` | 80 ms | ease-out | Press feedback |
| `motion-quick` | 160 ms | ease-out | Chips, toggles, row highlights |
| `motion-standard` | 240 ms | ease-in-out | Sheets, navigation |
| `motion-verdict` | 320 ms | ease-out | The verdict reveal |

- Motion answers a person's action. No ambient or looping decoration.
- **The verdict reveal** is the one orchestrated moment: color floods from the center, the icon draws, one haptic.
- With reduced motion on, replace all motion with an instant state change. The verdict screen still shows color, icon, and word.

### Haptics (cashier app)

| Event | Pattern |
|---|---|
| Item scanned | Light tap |
| Verified | Two short pulses |
| Rejected | One long pulse |
| Waiting | None |

## 6. Iconography

Simple outline icons at 24 px, 2 px stroke, rounded joins. Icons are paired with text for any action that changes money or data. A small set is enough: check, clock, cross, scan, search, flashlight, inbox, branch, person, warning, sync, offline.

## 7. Components

Each component lists its purpose, states, and notes. Names describe structure and job, not content.

### Button
**Purpose:** trigger an action.
**Variants:** `primary`, `secondary`, `destructive`, `text`.
**States:** default, pressed, focused, disabled, loading.
**Notes:** primary is `color-action-primary`. Only one primary per screen. Pressing gives an instant pressed state. While work runs, the label changes (for example to "Checking…") and a thin progress line runs along the bottom edge of the button. **No spinner.** The button keeps its exact size and position, and ignores a second tap.

### Money display
**Purpose:** show an amount.
**Sizes:** `body`, `figure`, `total`, `verdict`.
**Notes:** tabular figures, right-aligned in tables, two decimals always, currency suffix. Negative amounts use a minus sign and the destructive text color plus the word "refund" or "short" where relevant.

### Cart line
**Anatomy:** name, unit price, quantity stepper, line total.
**States:** default, just-added (150 ms highlight), removing (swipe with undo).
**Notes:** weighed items show quantity as `3.2 kg` and open a keypad on tap.

### Verdict screen
**Purpose:** tell the cashier whether to take the payment.
**Variants:** `verified`, `waiting`, `rejected`.
**Anatomy:** icon, one-word result, amount, the receiver's name (on Verified, so the check is visible), one-line reason, one or two actions.
**Notes:** full-bleed status color, large type, never more than two actions. Waiting shows a visible countdown and clear next steps: retry, enter payment ID, ask owner.

### Status chip
**Purpose:** show state in lists.
**Variants:** `verified`, `waiting`, `rejected`, `voided`, `info`.
**Notes:** tint background, strong text, leading icon. All three carry meaning.

### Status banner
**Purpose:** connection and sync state.
**Variants:** `online` (hidden), `offline`, `syncing`, `sync-failed`.
**Notes:** thin bar at the top, always visible when not fully online.

### Text field
**Anatomy:** label, input, helper or error text.
**States:** default, focused, filled, error, disabled.
**Notes:** labels above fields, never placeholder-only. Errors say what to fix.

### PIN pad
**Purpose:** unlock and approve.
**Notes:** large keys, dots for entry, no visible digits, shake plus haptic on error without revealing which digit was wrong.

### QR scan frame
**Purpose:** scan the payment QR on the customer's receipt.
**States:** searching, locked on (brief highlight and haptic), unreadable (after a few seconds, with a hint about light and distance), permission denied.
**Notes:** large frame with corner marks, flashlight toggle, a text line that names what to scan ("Scan the QR on the customer's receipt"), and a secondary "Enter payment ID" link.

### Bottom sheet
**Purpose:** cart and confirmations on mobile.
**Notes:** `radius-sheet`, `elevation-sheet`, drag handle, closes on scrim tap.

### Data table (owner web)
**Notes:** sticky header, numbers right-aligned in tabular figures, row click opens a side panel, filters in a bar above, empty state with a clear next step.

### Summary stat
**Anatomy:** label, number, comparison to previous period.
**Notes:** the number is `type-figure`. The comparison states direction in words as well as color.

### Chart card
**Notes:** one accent color plus neutrals, direct labels instead of legends when possible, a table alternative available, no 3D and no pie charts for more than three parts.

### Alert row
**Anatomy:** severity icon, plain description, branch, cashier, time, actions (Review, Dismiss).
**Notes:** severity uses icon shape and word, not only color.

### Skeleton
**Purpose:** show the shape of content that is about to appear.
**Variants:** `line`, `block`, `row`, `card`, `chart`, `table-row`, `verdict`.
**Notes:** built from `ground-100` blocks with the same sizes and radii as the real content, so nothing shifts when data arrives. See section 12.

### Progress checklist
**Purpose:** show setup progress to the owner (goal gradient).
**Anatomy:** title, a bar showing steps done out of total ("3 of 6"), the list of steps with the next one highlighted.
**Notes:** the account-created step is already ticked when the owner first sees it. Never fake progress.

### Empty state
**Notes:** one sentence on what is missing and one action. No illustrations required.

## 8. Voice and microcopy

| Rule | Do | Don't |
|---|---|---|
| Plain verbs, sentence case | "Complete sale" | "SUBMIT TRANSACTION" |
| Name the action by its result | "Charge 318.00 Birr" | "Proceed" |
| Same word through the flow | "Complete sale", then "Sale completed" | "Finish", then "Done!" |
| Say what, then what next | "Can't read this QR. Try again or enter the payment ID." | "Error 422" |
| No apology, no blame | "Payment is 40.00 Birr short." | "Oops, something went wrong!" |
| People's words | "payment ID" | "transaction reference" |

### Core strings

| Key | Text |
|---|---|
| `verdict.verified` | Verified |
| `verdict.waiting` | Waiting for provider |
| `verdict.rejected` | Rejected |
| `reason.reused` | This payment was already used for another sale. |
| `reason.short` | Payment is {amount} Birr short. |
| `reason.wrong_receiver` | This payment was sent to a different account. |
| `reason.untrusted_link` | This QR isn't from a supported payment provider. |
| `reason.not_successful` | The provider shows this payment as not completed. |
| `reason.too_old` | This payment is too old to use for this sale. |
| `waiting.provider_unreachable` | The provider isn't answering yet. Trying again. |
| `waiting.pending` | The provider shows this payment as pending. |
| `reason.unreadable` | Can't read this QR. Try again or enter the payment ID. |
| `banner.offline` | Offline. Sales are saved on this phone. |
| `banner.syncing` | Syncing {count} sales |
| `action.complete_sale` | Complete sale |
| `action.scan_qr` | Scan payment QR |
| `action.enter_payment_id` | Enter payment ID |
| `action.ask_owner` | Ask owner |

## 9. Accessibility checklist

- [ ] Every text and control pair meets WCAG 2.2 AA contrast
- [ ] Touch targets at least 48 px
- [ ] Visible focus on every interactive element, using `color-focus-ring`
- [ ] Layouts hold at 130% text size
- [ ] Verdicts have color, icon, and word
- [ ] Reduced motion respected
- [ ] Screen reader labels on scan area, cart lines, verdicts, and charts
- [ ] No information conveyed by sound alone

## 10. Implementation notes

**CSS variables (web)**

```css
:root {
  --color-bg-app: #F5F7F6;
  --color-bg-surface: #FFFFFF;
  --color-border-default: #D3DBD8;
  --color-text-primary: #1D2B28;
  --color-text-secondary: #5B6B67;
  --color-action-primary: #0B7A5C;
  --color-action-primary-pressed: #085E47;
  --color-status-verified-bg: #0B7A5C;
  --color-status-waiting-bg: #E0A21B;
  --color-status-rejected-bg: #B3261E;
  --color-focus-ring: #2F5D8A;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-app: #10201C;
    --color-bg-surface: #182A25;
    --color-text-primary: #E8F1EE;
    --color-action-primary: #4FD1A5;
  }
}
```

**Packages**
- `packages/ui-tokens` exports these as a JS object for React Native and as CSS variables plus a Tailwind theme for the web.
- No hex values outside that package.

## 11. UX laws applied

Use these wherever they fit. They are tools for making screens easier, not decoration.

| Law | What it says | How we apply it |
|---|---|---|
| **Jakob's law** | People expect your product to work like the ones they already know | Camera-style scan view, phone-style PIN pad, standard shopping-cart list, standard back arrow and tabs, familiar table behavior on the web. Do not invent a new pattern when a common one exists |
| **Hick's law** | More choices mean slower decisions | At most two main actions on any cashier screen. Payment method has two options. Verdict has one or two actions. Advanced options sit behind a "More" control. Defaults remove choices |
| **Law of proximity** | Things close together are read as related | Amount and currency sit together. A verdict's reason sits under its word. A field's label sits above it. A destructive action is separated from the primary action by clear space. Tighter spacing inside a group (8) than between groups (24) |
| **Miller's law** | People hold about seven things in mind at once | Owner navigation has 7 items. Summary stats on the dashboard are limited to 3 to 5. Payment IDs and numbers are shown in chunks. Onboarding has no more than 6 steps. Lists load in pages of about 10 |
| **Von Restorff effect** | The one item that stands out is the one remembered | One primary button per screen, in ledger green. The verdict screen is the one loud moment. Red appears only for rejection, fraud alerts, and destructive actions. If everything is highlighted, nothing is |

**Owner navigation (7 items):** Home, Sales and reports, Products, Cashiers, Branches (with saved accounts and optional devices inside), Alerts, Settings.

## 12. Loading, feedback, and speed

### Skeleton loaders, not spinners (whole app)

- Wherever we know what content will appear, show a **skeleton that matches the real layout**: same heights, widths, spacing, and radii. Content swaps in with a 120 ms fade and **no layout shift**.
- Skeletons exist for every screen that loads data: cart, product list, sales list, today's sales, dashboard stats and charts, tables, branch and cashier lists, and the verdict screen.
- Skeleton blocks use `ground-100` with a slow shimmer (about 1.2 s). With reduced motion on, the shimmer is replaced by a static block.
- If data arrives in under about 150 ms, skip the skeleton to avoid a flash.
- Rows: use the last known row count, or 6 if there is none.
- **Where the layout truly cannot be known** (for example a wait for a provider), show the shape of the screen that will appear (the verdict skeleton), a plain status line ("Checking with provider"), and a short step label. Still no spinner.
- Where the length is known (an import of 200 products), use a determinate progress bar with a count.

### Instant feedback

- Every control shows a pressed state within 100 ms and never feels dead.
- Buttons change label and show a progress line while working. They stay the same size and keep their place, and block double taps.
- The app acts first and confirms later, even when the real process takes longer.

| Action | Rendering |
|---|---|
| Scan an item | Line appears at once, with a light haptic |
| Change or remove a cart line | Immediate. Remove has an undo |
| Complete a cash sale | Completes on the device immediately, syncs later |
| Charge by mobile money | The verdict screen opens at once with a **skeleton**. **Verified is never shown until the server decides** |
| Add or edit a product | Appears at once, rolls back with a clear message if it fails |
| Permission and money-affecting changes (suspend, saved account change, override) | Button responds instantly, but the result waits for the server |
| Mark an alert reviewed | Immediate, with undo |

### Speed in the UI

- Long lists are virtualized. Images are avoided. Fonts are subset and loaded without causing layout shifts.
- The dashboard's initial script budget is small (target under about 200 KB gzipped for the home screen). Heavy chart code loads only where charts appear.
- Animations use only properties that are cheap to animate. The cashier app never blocks on animation.
- Responses are compressed, and the web app is a static site (see the [TRD speed rules](docs/02-technical-requirements.md)).

## 13. Onboarding stability

**Nothing moves during onboarding.** Buttons, fields, and progress stay where the person put their finger or eye.

- The primary button sits in the **same fixed place on every step**, pinned at the bottom, with Back and Next in the same positions.
- Space is **reserved** for helper text, errors, and loading states, so a message appearing never pushes the button down.
- Content areas have fixed or minimum heights per step. Skeletons match them.
- The progress indicator lives in a fixed header.
- Late-arriving banners and permission prompts use overlays or reserved slots, not inserted rows.
- The keyboard never makes the button jump. The button stays visible above it.
- Step changes animate the content, never the controls.
- **Check:** layout shift on onboarding screens must measure zero. This is part of the evaluation.

## 14. Errors for people

- **Never show backend errors**: no codes like 500, no stack traces, no database or library names, no URLs or IDs.
- Use the strings in section 8. Say what happened in plain words and what to do next.
- Different causes get different messages: no connection, the server is busy, the provider is not answering, too many tries, you are not allowed to do that, and something we can fix.
- When it helps support, show a short reference ID ("Reference: 7F3K") in small text. The details stay in server logs.
- An error never blames the person, and never removes what they have entered.

## 15. UX psychology, used honestly

These techniques help people finish setup, avoid mistakes, and protect their money. They are not used to pressure or mislead. Every number shown is real. No fake countdowns, no fake scarcity, no guilt.

| Principle | How we use it |
|---|---|
| **Smart defaults** | Cashier's branch and name are preselected. The last used payment provider is preselected. The payment time window starts at 60 minutes. Unit defaults to piece. Time zone is Africa/Addis_Ababa. A new product's price field has the right keypad. Defaults are always visible and changeable |
| **Goal gradient** | The owner's setup checklist shows "3 of 6" and highlights the next step. The first step (account created) is already done, so progress starts above zero. Import and long tasks show a real progress bar. The cashier sees "Today: 42 sales" growing through the day |
| **Reciprocity** | Give value before asking for anything. A sample product list and a try-it sample sale are available before the owner enters payment accounts. A CSV template is offered when importing. The first daily summary arrives without being asked for |
| **Endowment effect** | People value what feels theirs. The owner names their business and branches early and sees those names everywhere. Setup progress is saved. The cashier sees "your sales today". The dashboard fills with the owner's own data as soon as the first sale lands |
| **Loss aversion** | Frame protection as what would be lost. "2 reused payments blocked. 1,240 Birr protected this week." "620 Birr waiting on an unverified sale." Confirm destructive actions by saying exactly what is lost and what is kept: "Deleting this cashier removes their access. Their sales history is kept." Use it to prevent mistakes, not to scare |

## 16. Simplicity, consistency, and visual hierarchy

### Simplicity
- One main task per screen. Remove before adding.
- Plain words, few options, advanced settings out of the way.
- No more than two levels of navigation.

### Consistency
- The same component behaves the same everywhere, and the same word means the same thing everywhere.
- The primary action is always in the same place: full width at the bottom on the cashier app, top right on web tables.
- Icons keep one meaning. States always use the same color, icon, and word.
- Tokens only: no one-off colors, sizes, or spacing.
- Follow platform conventions for gestures, back behavior, and keyboards.

### Visual hierarchy
- Each screen has **one focal point**: the total on the charge screen, the verdict on the verdict screen, the income number on the dashboard.
- Order of attention: the number, then the action, then the detail.
- Size, weight, color, and spacing are used in that order of strength. Secondary text uses `ink-600`.
- Whitespace separates groups. Use the squint test: blur your eyes and the main thing should still stand out.

## 17. Design references

The following were asked for as inputs to this design system:

| Reference | Status |
|---|---|
| Awesome DESIGN.md | Not available in the session that wrote this file. This file follows the common DESIGN.md pattern of tokens, components, voice, and rules, so it can be compared against collections of that kind later. |
| Impeccable | Not available in this session. |
| Taste skill | Not available in this session. |
| Web design guidelines | Not available in this session. The accessibility, interaction, and content rules above cover the same ground. |
| UI UX Pro Max | Not available in this session. |

What was applied instead: principles from the design-systems, design-critique, interaction-design, accessibility, and UX-writing guidance available in the working environment: three-tier tokens, component specs with states, WCAG 2.2 AA contrast, plain-language microcopy, one signature moment, and avoiding templated defaults.

**To use the named references:** add each one's instructions or files to the repo (for example under `docs/design-references/`) and ask the agent to reconcile them with this file. Where they disagree, this file wins until the student decides otherwise, and the decision goes into [docs/agent/MEMORY.md](docs/agent/MEMORY.md).
