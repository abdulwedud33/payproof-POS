# MEMORY.md

The project's working memory. Read it at the start of every session and update it when something is decided or learned. Keep entries short and dated.

**Rules for this file**
- Record decisions, constraints, learnings, and open questions. Not chat history.
- Never record personal data about real people, real receipts, account numbers, or phone numbers.
- When a decision changes, edit the line and note what it replaced. Do not leave contradictions.
- Mark each decision **Decided** (the student said so), **Proposed** (suggested, awaiting a yes), or **Superseded**.

---

## 1. Project facts

| Fact | Detail | Status |
|---|---|---|
| Name | PayProof POS is a working name | Proposed |
| Context | ASTU Computer Science and Engineering senior (BSc) project | Decided |
| Department rules | One title per group, software is the main component, no repeat of past projects, compare with the past-project list, realistic scope | Decided |
| Closest past project to compare | *Real Time Stock Management System* | Decided |
| Builders | The student and an AI agent, together. The build runs in Google Antigravity | Decided |
| Quality bar | Production ready, advanced app. See docs/08-production-readiness.md | Decided |
| Build gate | No application code until the student says "start building" | Decided |
| Reference material | The student named Awesome DESIGN.md, Impeccable, Taste skill, web design guidelines, and UI UX Pro Max as design inputs. They were not available when the docs were written | Open |

## 2. Product decisions

| # | Decision | Status |
|---|---|---|
| P1 | Multi-branch from day one. Owner manages many branches and many cashiers | Decided |
| P2 | Owner can add, edit, and delete cashiers. Deleting a cashier with sales deactivates them and keeps history | Proposed |
| P3 | Cashier scans barcodes or QR codes, and the cart total is shown | Decided |
| P4 | Customer pays the shop's account, then the cashier verifies the payment before completing the sale | Decided |
| P5 | Owner dashboard shows items sold, what was sold, and income, daily, weekly, and monthly | Decided |
| P6 | Each branch has one or more saved receiving accounts. The owner enters them, and receiver matching uses them | Decided |
| P7 | Cash sales are included so the owner sees complete takings | Proposed |
| P8 | Weighed items (like watermelon) are entered by quantity | Proposed |
| P9 | Android first. iOS is a stretch goal | Proposed |
| P10 | Stock tracking is a stretch goal | Proposed |

## 2a. Standing rules (from the student, 24 Oct 2026)

All **Decided**. Detail lives in [SECURITY.md](../../SECURITY.md), [DESIGN.md](../../DESIGN.md), and the TRD speed rules.

| Group | Rules |
|---|---|
| Security | No secrets or keys in the frontend or app. Users access only authorized data. Backend and database rules enforced. All user and AI input validated. Row-level security on every table with policies. Rate limiting on every API. Users never see backend errors |
| UX laws | Jakob's, Hick's, proximity, Miller's, and Von Restorff, wherever they fit. (The student wrote "Kabob's law", read as Jakob's law. Confirm if another was meant) |
| Loading and feedback | No spinners where the layout is known: skeleton loaders that match the real screen, across the whole app. Instant feedback on every control, even when the process takes longer. No buttons moving during onboarding |
| UX psychology | Smart defaults, goal gradient, reciprocity, endowment effect, loss aversion, used honestly |
| Principles | Simplicity, consistency, visual hierarchy |
| Speed | No uncompressed JSON. No illogical database writes. No single dependency bottleneck. Optimistic rendering. Statically hosted web app |

**How some rules were applied (check these are what you meant):**
- *Optimistic rendering* covers cart, cash sales, product edits, and alert review. It does **not** cover money outcomes: Verified is shown only after the server decides.
- *Statically hosted* means the owner dashboard is a static export on a CDN. It has no server-side rendering. Data comes from the API after sign-in.
- *AI input* means anything produced by a language model or AI tool, plus OCR output and parsed provider data. The core product has no language model.
- *Row-level security* needs the API to set the user's context on each database transaction, and login uses a narrow database function because no user is known yet.

## 3. Technical decisions

| # | Decision | Status |
|---|---|---|
| T1 | Stack: React Native cashier app, Next.js owner dashboard, Node.js + TypeScript API, Python FastAPI verification service, PostgreSQL, SQLite offline queue, JWT auth, Docker Compose, pnpm monorepo. Kotlin SMS companion is now optional | Decided |
| T2 | **Verification is based on the provider's own record.** The cashier scans the payment QR, the server fetches the official receipt page, and the receiver must match the branch's saved account. This replaces the earlier "SMS is truth" design | Decided (student's call, 24 Oct 2026) |
| T2-old | Earlier design: SMS match required for Verified, image analysis advisory | **Superseded** by T2. Kept as the fallback if A1 is false |
| T3 | Money stored as integer santim | Proposed |
| T4 | Sales are append-only with client UUID v7 and idempotency keys | Proposed |
| T5 | SMS companion, payment inbox, and receipt-image checks are optional backup evidence and never verify a sale alone | Proposed |
| T6 | Only the verification service fetches external pages, and only from an allowlist of official provider hosts | Proposed |
| T7 | Full QR text and raw SMS text are not stored. Only hashes and extracted fields | Proposed |
| T8 | A mock provider server is used for development and tests | Proposed |
| T9 | Saved payment account changes need the owner's PIN and raise an alert | Proposed |

## 3a. Assumptions to confirm

| ID | Assumption | Status |
|---|---|---|
| **A1** | The payment QR on a Telebirr or CBE receipt links to an official provider page our server can fetch and read, showing transaction ID, amount, time, status, and receiver | **Assumed by the student. Unconfirmed. First task of Milestone 0.** If false, switch to the fallback in TRD 4.8 |
| A2 | Each branch has one or more receiving accounts the owner can enter | Assumed |
| A3 | Real sample receipts can be collected | Assumed |
| A4 | Fetching a provider's public receipt page is acceptable under its terms | Unchecked |

## 4. Domain notes

*Fill these in from Milestone 0. Do not guess.*

| Question | What we know |
|---|---|
| What does the Telebirr receipt QR contain? | Unknown |
| What does the CBE receipt QR contain? | Unknown |
| Which hostnames are official? | Unknown |
| Does the receipt page need a login, captcha, or JavaScript? | Unknown |
| What fields does the page show for the receiver (name, account, phone, masked)? | Unknown |
| How long does a receipt link stay valid? | Unknown |
| Can a payment be looked up by transaction ID alone? | Unknown |
| What are the providers' rules for automated access? | Unknown |
| Do shops use one receiving account per branch? | Unknown, to ask owners |

## 5. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Past-project list: any overlap with POS, payment verification, or supermarket systems? | Student | Proposal submission |
| Q2 | **Does the payment QR lead to a readable provider page? (A1)** | Student, with Claude | M0, first |
| Q3 | Can we collect real receipts from friends and a shop? | Student | M0 |
| Q4 | Which shop will act as a trial partner? | Student | M2 |
| Q5 | What payment time window should be allowed? Proposed 60 minutes | Student | M4 |
| Q6 | What void amount needs the owner's PIN? | Student | M6 |
| Q7 | Which phones will we test on? Two models at least | Student | M2 |
| Q8 | Should the proposal text already submitted (which mentions SMS matching) be updated? | Student | Before the next review |

## 6. Learnings

*Add dated notes when something surprises us or a bug teaches us something.*

| Date | Learning |
|---|---|
| 22 Nov 2026 | CSV Formula Injection (CWE-1236): Product CSV imports must prefix cells starting with `=, +, -, @, \t, \r` with `'` to prevent spreadsheet DDE code execution upon export. |
| 22 Nov 2026 | Sale Immutability: Post-sale modifications must be rejected by PostgreSQL triggers at the database layer; only void transitions with reasons and PINs are permitted. |
| 22 Nov 2026 | Offline Outbox Sync: Cashier SQLite sales outbox must store client-generated UUID v7 IDs and idempotency keys to guarantee idempotent re-syncing without duplicate sales. |

## 7. Do not repeat

*Mistakes and dead ends, so they are not tried again.*

| Date | What was tried | Why it failed |
|---|---|---|
| | | |

## 8. Session log

*One line per working session: what was done and what is next.*

| Date | Done | Next |
|---|---|---|
| 24 Oct 2026 | Compared title options, chose the supermarket payment-verification project, wrote the full documentation set | Student reviews docs, checks past-project list, runs Milestone 0, then says "start building" |
| 24 Oct 2026 | Student added standing rules for security, UX, and speed. SECURITY.md exists. Rules folded into the PRD, TRD, schema, design system, UX brief, app flow, plan, evals, tools, prompts, and guardrails | Student reviews the rules and the interpretations in section 2a |
| 24 Oct 2026 | Student changed the core design: verification now reads the provider's receipt page behind the payment QR and matches the receiver to the branch's saved account. SMS is optional backup. All docs updated | Student tests what the receipt QR codes lead to (A1) |
| 21 Nov 2026 | Packaged the project for Google Antigravity: rules, skills, GEMINI.md, kickoff prompt, per-milestone prompts, production readiness doc | Student opens the folder in Antigravity, runs Milestone 0 in parallel, pastes the kickoff prompt |
| 22 Nov 2026 | M1 Foundation built: monorepo, strict TS, @payproof/money, @payproof/shared-types, db migrations with RLS, Fastify apps/api with error masking & rate limits, auth & cashier/branch management, security test suites, secret scanning | Student reviews M1 Walkthrough, runs Docker/Postgres tests, and approves M1 checkpoint |
| 22 Nov 2026 | M2 Catalog & Cashier Sale built: @payproof/ui-tokens (palette & presets), shared-types (catalog/sales/sync), 0002_catalog_and_sales.sql with immutability triggers & reporting views, 200 Ethiopian products seed, Products/Sales/Sync API, Next.js static export owner-web with real skeletons, cashier-app cart & offline SQLite queue | Student reviews M2 Walkthrough, tests owner-web & cashier-app, and approves M2 checkpoint |
