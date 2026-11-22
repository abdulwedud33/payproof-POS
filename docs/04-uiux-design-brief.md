# 04 · UI/UX Design Brief

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Version**               | 0.1 draft, 24 Oct 2026           |
| **Tokens and components** | [DESIGN.md](../DESIGN.md)        |
| **Flows**                 | [03-app-flow.md](03-app-flow.md) |

---

## 1. Subject, audience, and job

**Subject:** a supermarket checkout counter in Ethiopia, where payment is a screenshot and trust is the problem.
**Audience:** cashiers under queue pressure, and owners checking in from a laptop or phone.
**Primary job of the design:** get a cashier to a confident _take the money / don't take the money_ answer in under a second of looking.

## 2. The design idea

**The verdict screen is the product.** Everything else is quiet, fast, and predictable. The one memorable moment is the full-screen verdict after a payment check: a single word, the amount in very large tabular figures, and a color flood the cashier can read from an arm's length away, in bright light, without reading small text.

Spend boldness there. Keep the rest disciplined.

## 3. Context the design must respect

| Condition                                    | Design consequence                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Bright, mixed shop lighting, phone glare     | High contrast, large type, no pale-gray-on-white text                            |
| One hand holds goods or the phone            | Primary actions in the bottom thumb zone, 56 px minimum height                   |
| Noisy                                        | Verdict also uses haptics and an optional short sound. Never rely on audio alone |
| A queue is watching                          | No modal chains. One decision per screen                                         |
| Mid-range Android, 360 × 800                 | Design at 360 wide first. No heavy blur or animated gradients                    |
| Intermittent internet                        | Always show connection and sync state. Never a spinner without a reason          |
| Many users read English as a second language | Short plain sentences, numerals first, icons paired with words                   |
| Money                                        | Numbers are tabular-aligned and never truncated. Currency is always shown        |

## 4. Principles

1. **One screen, one decision.** The cashier never has to choose between more than two main actions.
2. **Say the result, then the reason.** "Rejected" first, "This payment was already used" second.
3. **Never use color alone.** Every state has a word and an icon as well.
4. **Numbers are the interface.** Totals and amounts get the biggest, steadiest type.
5. **Quiet by default, loud when it matters.** Only verdicts and fraud alerts are allowed to be loud.
6. **Speed is a feature.** Optimistic updates, local-first cart, no blocking loaders.
7. **Honest states.** If something is not verified yet, the interface says so plainly.

## 5. Cashier app

### 5.1 Scan and cart (the home of the app)

```
┌──────────────────────────────┐
│ Bole Branch        ● Online  │  status bar: branch, connection
├──────────────────────────────┤
│                              │
│        [ camera view ]       │  ~40% of height
│        ┌──────────┐          │
│        │ scan box │    ⚡ 🔍  │  flash, search
│        └──────────┘          │
├──────────────────────────────┤
│ Bread               1  42.00 │
│ Injera (10 pcs)     2 180.00 │
│ Watermelon 3.2 kg      96.00 │  weighed item shows kg
│                              │
│ 3 items                      │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │  Charge   318.00 Birr  │  │  primary action, 64 px tall
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- The cart is a bottom sheet that can be pulled up for long lists.
- Last scanned line flashes briefly to confirm the scan, with a light haptic.
- Quantity changes use large plus and minus buttons.
- Removing a line uses a swipe with an undo, never a confirm dialog.

### 5.2 Collect mobile payment

```
┌──────────────────────────────┐
│ ←  Mobile money              │
├──────────────────────────────┤
│        Customer pays         │
│                              │
│       318.00 Birr            │  display size
│                              │
│  To: Bole Branch · Telebirr  │  the account the customer must pay
│                              │
│ ┌──────────────────────────┐ │
│ │    Scan payment QR       │ │  primary
│ └──────────────────────────┘ │
│      Enter payment ID        │  secondary
└──────────────────────────────┘
```

### 5.3 Verdict screen (the signature moment)

Three states. Same layout, different color, word, and icon.

```
VERIFIED                 WAITING                  REJECTED
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│       ✓        │      │       ◔        │      │       ✕        │
│   Verified     │      │ Waiting        │      │   Rejected     │
│                │      │                │      │                │
│ 318.00 Birr    │      │ 318.00 Birr    │      │ 318.00 Birr    │
│                │      │ Provider isn't │      │                │
│ Telebirr       │      │ answering yet. │      │ Sent to a      │
│ To Bole Branch │      │ Trying again   │      │ different      │
│                │      │ 0:12           │      │ account        │
│ [Complete sale]│      │ Retry · Ask    │      │ [Scan another] │
│                │      │ owner          │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
 green fill              amber fill               red fill
```

Behavior:

- On arrival, the color floods from the center in about 300 ms, the icon draws, and the phone gives one haptic. Verified and Rejected use different haptic patterns so they can be felt.
- With reduced-motion on, the screen simply appears with no animation.
- The Verified screen names the receiver ("To Bole Branch") so the cashier can see the check really happened.
- A warning on a Verified sale (for example, a near-match on the receiver name) appears as a quiet strip below the amount, never as a competing headline.

### 5.4 Enter payment ID (fallback)

- Reached from "Enter payment ID" when the QR cannot be scanned.
- One large field with a numeric or alphanumeric keypad, the provider chosen first, and a clear "Check payment" button.
- It runs the same checks as a scanned QR. The screen says so, so cashiers do not expect a shortcut.
- If the provider does not support lookup by ID, this screen is replaced by a short explanation and the "Ask owner" action.
- If the optional SMS companion is built, a payment inbox of recent unclaimed payments can be added here as backup evidence.

### 5.5 Today's sales

- A flat list with total at the top. Voided sales are struck through with a "Voided" label.
- Void is reached from the sale detail and uses reason chips, not free text.

## 6. Owner dashboard

### 6.1 Home

```
┌────────────────────────────────────────────────────────────┐
│ Overview            [Today] Week  Month     All branches ▾ │
├────────────────────────────────────────────────────────────┤
│  Income            Sales            Items sold             │
│  48,230 Birr       214              1,102                  │
│  +8% vs last week  ...              ...                    │
├────────────────────────────────────────────────────────────┤
│  Income by day (bars)             │ Branches               │
│                                   │ Bole      21,400  ▮▮▮▮  │
│                                   │ Piassa    15,120  ▮▮▮   │
│                                   │ Adama     11,710  ▮▮    │
├───────────────────────────────────┴────────────────────────┤
│ Needs attention (3)                                        │
│ ✕ Reused payment, Piassa, Dawit, 10:42                     │
│ ! Override approved, Bole, 09:15                           │
└────────────────────────────────────────────────────────────┘
```

Guidelines:

- Answer the owner's first question ("how did today go?") with three numbers and a trend.
- Alerts sit directly under the numbers, never hidden in a menu.
- Charts are simple: bars for time, horizontal bars for comparison. One accent color, one neutral.
- Every number links to the list behind it.
- Tables are the main tool for detail, with sticky headers and right-aligned numbers.

### 6.2 Management screens

Branches, cashiers, and products use the same pattern: searchable table, row click opens a side panel, primary action at top right. **Saved payment accounts** live inside a branch: the number is shown masked, and adding or changing one asks for the owner's PIN, because it decides which payments are accepted. Destructive actions (suspend, delete) sit away from the primary action and always say what will happen to history.

## 7. Visual direction

Detailed tokens live in [DESIGN.md](../DESIGN.md). In summary:

- **Mood:** calm, exact, trustworthy. Closer to a well-made ledger than a flashy fintech app.
- **Color:** a cool off-white ground, deep ink text, one ledger green for verification and primary actions, amber for waiting, red for rejection. No gradients.
- **Type:** one family with tabular figures, plus a script-appropriate fallback for Amharic.
- **Shape:** different radii for different jobs (inputs, cards, sheets), not one radius everywhere.
- **Depth:** borders and tonal surfaces over drop shadows.
- **Motion:** only for feedback to a person's action, plus the single verdict reveal.

## 8. Content and voice

| Principle                     | Example                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| Plain verbs, sentence case    | "Complete sale", not "SUBMIT TRANSACTION"                                  |
| Say what happens              | "Charge 318.00 Birr"                                                       |
| Same name everywhere          | The button says "Complete sale" and the confirmation says "Sale completed" |
| Errors say what and what next | "Can't read this QR. Try again or enter the payment ID."                   |
| No apologies, no blame        | "Payment is 40.00 Birr short." not "Oops! Something went wrong"            |
| Names for people, not systems | "payment ID", not "transaction reference"                                  |

## 9. Accessibility

- Text contrast meets WCAG 2.2 AA, large text and verdict screens aim for AAA where possible.
- Touch targets at least 48 px, primary actions 56 to 64 px.
- Every verdict has color, icon, and word. Haptics and sound are additions, not the only signal.
- Dynamic type is supported. Layouts hold at 130% text size.
- Screen reader labels for scan area, cart lines, and verdicts.
- Reduced-motion removes the verdict reveal animation.
- Dashboard is fully keyboard navigable with visible focus.

## 10. Localization

- All strings in translation files. English is the first language.
- Fonts include Ethiopic script support from the start, so Amharic text never falls back to a mismatched system font.
- Layouts allow for text 30% longer than English.
- Numbers use Western digits. Dates show the Gregorian calendar, with an optional Ethiopian calendar as a stretch.

## 11. Component priorities

First: Button, Money display, Cart line, Verdict, Status banner, Text field, PIN pad, QR scan frame.
Second: Table, Chart card, Side panel, Alert row, Branch picker, Date range tabs.
Later: Empty states, onboarding checklist, CSV import wizard.

## 12. Usability tests

Test with at least 5 people before final submission.

| Task                                                            | Success measure                       |
| --------------------------------------------------------------- | ------------------------------------- |
| Sell 3 items for cash                                           | Under 45 seconds, no help             |
| Sell 3 items by Telebirr with a real receipt                    | Under 60 seconds                      |
| Handle a reused receipt and a payment sent to the wrong account | Correctly refuses and can explain why |
| Owner adds a cashier and assigns a branch                       | Under 90 seconds                      |
| Owner finds yesterday's income for one branch                   | Under 30 seconds                      |

## 13. UX laws on this product

Definitions and rules are in [DESIGN.md section 11](../DESIGN.md). This is where they show up. _(The brief's "Kabob's law" is Jakob's law: people expect your product to work like the ones they already know.)_

| Law                     | Where it shows up                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jakob's law**         | The scan screen looks like any camera scanner. The cart is a list with a total at the bottom, like other shopping and checkout apps. The PIN pad looks like a phone lock screen. The owner dashboard uses a side menu and tables like common admin tools |
| **Hick's law**          | Charge screen: two choices (Cash, Mobile money). Verdict: one or two actions. Cashier home: one primary button. Owner menu: 7 items. Table filters: 3 visible, the rest under "More filters"                                                             |
| **Law of proximity**    | Cart row: name, quantity, and price sit on one row, 8 px apart, and rows are 16 px apart. On the verdict, the amount sits directly under the word and the reason directly under the amount. Destructive buttons sit at least 24 px from the primary one  |
| **Miller's law**        | Dashboard home shows at most 4 stat cards. Onboarding has no more than 6 steps. Long numbers (payment IDs, account numbers) are shown in groups of 3 or 4. Lists load about 10 rows at a time. Cashier home shows no more than 3 things                  |
| **Von Restorff effect** | One filled green button per screen. The verdict is the only full-screen color. Red appears only for rejection, fraud alerts, and destructive actions. "Needs attention" is the only tinted card on the dashboard home                                    |

## 14. Loading, feedback, and optimistic screens

**No spinners where the layout is known.** Every screen that loads data shows a skeleton with the same layout as the real content, across the whole app. Rules for timing and motion are in [DESIGN.md section 12](../DESIGN.md).

### Skeleton inventory

| Screen                                       | Skeleton shape                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Scan and cart                                | Cart rows (as many as last time, else 6) and the total bar                                                                 |
| Today's sales                                | 6 rows with an amount and a status chip each                                                                               |
| **Verdict while checking**                   | The verdict layout in neutral gray, with a plain status line ("Checking with provider") and a short step label. No spinner |
| Sale detail                                  | Header block, item rows, and a payment evidence card                                                                       |
| Owner home                                   | 3 or 4 stat cards, one chart card, 5 branch rows, 3 alert rows                                                             |
| Tables (sales, products, cashiers, branches) | Header row and 10 table rows                                                                                               |
| Forms that load existing data                | Field blocks in the final positions                                                                                        |
| Payment accounts list                        | 2 account cards                                                                                                            |
| CSV import                                   | A determinate progress bar with a count, since the length is known                                                         |

### Feedback

- Every tap shows a pressed state within 100 ms. The button label then changes to what is happening ("Charging 318.00 Birr") and the button keeps its size and place.
- Anything that can be done on the device is shown at once: a scan, a quantity change, a cash sale.
- **Money outcomes are never shown early.** After a mobile-money charge, the verdict screen opens immediately with its skeleton, and Verified appears only after the server decides. The same goes for voids, overrides, saved-account changes, and suspending a cashier: the button responds instantly, the result waits for the server.

## 15. Onboarding layout

Nothing moves during onboarding. Space is reserved for every message, so the buttons never jump.

```
┌──────────────────────────────┐
│ ←  Step 2 of 6   ████░░░░░░  │  fixed header with progress
├──────────────────────────────┤
│ Add your first branch        │
│                              │
│ Branch name                  │
│ [_______________________]    │
│ City                         │
│ [Adama                  ]    │  smart default, changeable
│                              │
│ (reserved line for errors)   │  always takes this space
│                              │
├──────────────────────────────┤
│ [ Back ]          [Continue] │  pinned to the bottom, same place every step
└──────────────────────────────┘
```

- Back and Continue are in the same position on every step.
- The keyboard never pushes the buttons out of view or makes them jump.
- Error text, helper text, and loading state appear in reserved slots, not inserted rows.
- Layout shift on onboarding screens is measured, and the target is zero.

## 16. Error messages

Users never see backend errors: no codes, stack traces, table names, or URLs. The app maps each error code to one of these messages. Details stay in server logs.

| Cause                  | The person sees                                           | What they can do           |
| ---------------------- | --------------------------------------------------------- | -------------------------- |
| No connection          | "You're offline. Sales are saved on this phone."          | Keep working               |
| Server slow            | "This is taking longer than usual. Your sale is safe."    | Wait or retry              |
| Provider not answering | "The provider isn't answering yet. Trying again."         | Wait, retry, ask owner     |
| Too many tries         | "Too many tries. Wait a minute and try again."            | Wait                       |
| Not allowed            | "You don't have access to this."                          | Go back                    |
| Session ended          | "You were signed out. Sign in again. Your cart is saved." | Sign in                    |
| Our fault              | "Something went wrong on our side. Reference 7F3K."       | Retry, quote the reference |

An error never blames the person and never clears what they typed.

## 17. UX psychology on screens

Used to help people finish setup, avoid mistakes, and protect their money. Every number shown is real. No fake urgency, no fake scarcity, no guilt.

| Technique            | Where it appears                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Smart defaults**   | Cashier's branch and name preselected. The last payment provider preselected. Payment time window starts at 60 minutes. Unit defaults to piece. City defaults to the branch's city. Time zone is Africa/Addis_Ababa. Owner dashboard opens on Today and All branches                       |
| **Goal gradient**    | Owner setup shows "3 of 6" with the first step already done, and highlights the next step. CSV import shows real progress. The cashier sees "Today: 42 sales" grow through the day                                                                                                         |
| **Reciprocity**      | Give before asking. The owner can try a sample sale with sample products before entering payment accounts. A CSV template is offered on import. The first daily summary arrives without being asked for                                                                                    |
| **Endowment effect** | The owner names the business and branches in the first steps and sees those names everywhere. Setup progress is saved. The dashboard fills with their own data from the first sale. The cashier sees "your sales today"                                                                    |
| **Loss aversion**    | A "Protected this week" strip on the dashboard home: "2 reused payments blocked · 1,240 Birr". "620 Birr is waiting on 1 unverified sale." Destructive confirmations say exactly what is lost and what is kept: "Deleting this cashier removes their access. Their sales history is kept." |

## 18. Simplicity, consistency, and visual hierarchy

| Screen          | Focal point        | Then            | Then                   |
| --------------- | ------------------ | --------------- | ---------------------- |
| Charge          | Total              | Charge button   | Item count             |
| Verdict         | The word and color | Amount          | Reason and next action |
| Owner home      | Income number      | Needs attention | Branch comparison      |
| Sales list      | Amount and status  | Time            | Cashier and branch     |
| Onboarding step | The question       | The field       | Continue               |

- One main task per screen. Remove before adding.
- The same action sits in the same place everywhere (bottom, full width on the cashier app. Top right on web tables).
- The same word means the same thing everywhere ("Complete sale", then "Sale completed").
- Squint test: with blurred eyes, the focal point must still stand out.

## 19. Speed as experience

| What the person feels                                      | Budget                                            |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Scan adds a line                                           | Under 300 ms                                      |
| Any tap shows a response                                   | Under 100 ms                                      |
| A skeleton appears only if data takes longer than          | About 150 ms                                      |
| Owner home on a mid-range phone, typical mobile connection | First useful content under about 2 s              |
| The dashboard's initial script, compressed                 | Around 200 KB or less for the home screen         |
| Offline                                                    | Cart, catalog search, and cash sales keep working |

The dashboard is a static site on a CDN, responses are compressed, and screens act first and confirm later, except for money verdicts.

## 20. Deliverables

1. Low-fidelity wireframes of all screens in the flow.
2. High-fidelity designs for scan and cart, verdict, enter payment ID, owner home.
3. Interactive prototype of the full sale flow.
4. Component and token sheet matching [DESIGN.md](../DESIGN.md).
5. A skeleton for every screen that loads data, matching its final layout.
6. An onboarding prototype that passes the zero layout-shift check.
