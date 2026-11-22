# 07 · Antigravity Playbook

How to build PayProof POS with Google Antigravity: setup, the kickoff prompt, the per-milestone prompts, and how to review what the agent produces.

|             |                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 0.1 draft                                                                                                                                                     |
| **Related** | [AGENTS.md](../AGENTS.md) · [GEMINI.md](../GEMINI.md) · [Implementation plan](06-implementation-plan.md) · [Production readiness](08-production-readiness.md) |

---

## 1. What is in this folder for Antigravity

| Path                         | What Antigravity does with it                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                  | Loaded on every turn as an always-on rule. The project's core rules                                                                                                         |
| `GEMINI.md`                  | Antigravity-specific operating rules: plan first, artifacts, checkpoints                                                                                                    |
| `.agents/rules/*.md`         | Focused rules that load when relevant: `security`, `testing`, `performance` (model decides) and `database`, `ui-ux`, `verification` (when matching files are touched)       |
| `.agents/skills/*/SKILL.md`  | Reusable procedures you can call by name: `/build-milestone`, `/new-endpoint`, `/new-table-with-rls`, `/build-screen`, `/security-review`, `/m0-findings`, `/release-check` |
| `docs/` and root `*.md`      | The source of truth the rules and skills point to                                                                                                                           |
| `.env.example`, `.gitignore` | Placeholders only. Real secrets and real data stay out of git                                                                                                               |

These locations and formats follow Antigravity's documentation for rules and skills: `AGENTS.md` and `GEMINI.md` need no frontmatter, files inside `.agents/rules/` must sit directly in that folder and start with a valid `trigger`, and each skill is a folder with a `SKILL.md` holding a `name` and `description`. Individual rule files are limited to 24 KB.

## 2. Setup

1. Unzip or copy the `payproof` folder somewhere permanent and **open that folder as the workspace** so `AGENTS.md` is at the workspace root.
2. Put it under Git (`git init`, first commit). Commit before the agent changes anything, so every change is reviewable and reversible.
3. Open the agent's **Customizations** panel and check that you see:
   - Rules: `AGENTS.md`, `GEMINI.md`, and the six rules from `.agents/rules/`
   - Skills: the seven project skills
     If a rule is missing, check that its first lines are the `---` frontmatter block with a valid `trigger` (`always_on`, `model_decision`, `glob`, or `manual`, written exactly like that). A rule with a wrong trigger is silently ignored.
4. Choose the strongest model you have available for planning and security work. Model names and quotas change, so check what your account offers.
5. Use the mode where the agent **plans first and asks for review**, not the fastest mode. For a payments product, speed matters less than reviewed plans.
6. Set terminal permissions conservatively: allow the project's test, lint, build, and Docker commands, and require approval for anything else. Names of these settings vary between versions, so look for the review policy and terminal command policy in settings.
7. Keep the browser limited to the local app and documentation. Do not let it log in to real accounts or open real payment pages.
8. Do **not** put real secrets, real receipts, real phone numbers, or real account numbers anywhere in the workspace.

## 3. Your parallel track: Milestone 0

The agent can build the foundation while you do Milestone 0 by hand. It cannot do M0 for you, because it needs real receipts.

Do this in parallel with M1 and M2:

1. Scan the QR on 20 or more real Telebirr and CBE receipts.
2. Note what each QR contains: a link, which host, which path pattern (remove IDs).
3. Open the links in a private browser window, not logged in, and note what the page shows (transaction ID, amount, time, status, receiver, masked or not), and whether it needs a login, captcha, or JavaScript.
4. Try fetching one from a script and see if it returns the same data.
5. Check whether a payment can be looked up by ID alone, and read the providers' rules about automated access.
6. Then run `/m0-findings` and give the agent the redacted facts. It writes `docs/agent/M0-FINDINGS.md` and decides whether Assumption A1 holds.

Until that file exists, the agent builds against the mock provider only.

## 4. The kickoff prompt

Paste this into a new Antigravity conversation. Fill in the two bracketed lines.

```text
You are the lead engineer on PayProof POS, a production-grade, multi-branch supermarket point-of-sale
with real-time mobile-money payment verification. I am the product owner and reviewer. This is a
payments product, so correctness, security, and honesty matter more than speed.

MISSION
Build PayProof POS to production quality, milestone by milestone, exactly as specified in this
repository's documents. Cashiers scan items and verify a customer's Telebirr or CBE payment by scanning
the payment QR. Our server fetches the provider's own record, matches the receiver to the branch's
saved account, checks amount, time, and status, and claims the transaction ID once. Owners manage
branches, cashiers, products, and see sales, income, and fraud alerts.

SOURCE OF TRUTH (read in this order, fully, before doing anything)
1. AGENTS.md and GEMINI.md (you already load these as rules)
2. docs/agent/MEMORY.md
3. docs/01-product-requirements.md
4. docs/02-technical-requirements.md
5. docs/05-backend-schema.md
6. SECURITY.md and docs/agent/GUARDRAILS.md
7. DESIGN.md and docs/04-uiux-design-brief.md and docs/03-app-flow.md
8. docs/06-implementation-plan.md, docs/agent/EVALS.md, docs/08-production-readiness.md
If two documents disagree, do not choose silently. List the conflict and ask me.

THE GATE
Start building. This opens the build gate for exactly this scope:
- Milestone 1 (foundation) and Milestone 2 (catalog and cashier sale, single branch, cash only), and
- from Milestone 3, only the safe-fetching layer, the mock provider server, and the evidence contract.
Do NOT yet build: real provider parsers, receiver-matching rules tuned to real pages, the final
decision thresholds, the optional SMS companion, stock tracking, or iOS. Those wait for
docs/agent/M0-FINDINGS.md, which I am producing in parallel. Assumption A1 (the payment QR links to a
readable provider page) is unconfirmed. Do not build on it silently.

NON-NEGOTIABLE RULES (enforced by tests, not intentions)
- No secrets or keys in the apps or web bundle. Only the public API base URL ships to clients.
- Users reach only authorized data. Every route declares its roles. Every query is scoped by business
  and branch.
- Row level security is enabled and forced on every table with written policies. The API role cannot
  bypass it. Add an RLS test for every table.
- Validate all input at every boundary, including QR text, files, provider pages, and any AI or tool output.
- Rate limit every API route. 429 with Retry-After. Test it.
- Never show backend errors to users. Log detail with a request ID, show a friendly message and a short code.
- A mobile-money sale becomes paid only from a successful provider record, a receiver match, and an
  atomic one-time claim. Never from the client, an image, or an SMS alone.
- Money is an integer in santim. Never floats.
- UI: skeleton loaders that match the real layout (no spinners where the layout is known), instant
  feedback on every tap, optimistic updates except for payment verdicts, no layout shift in onboarding,
  the UX laws and psychology notes in DESIGN.md, applied honestly.
- Speed: compressed JSON, sensible database writes (one transaction per sale, batched inserts, no writes in
  loops), no single-dependency bottleneck, statically hosted web dashboard.
- No real customer data, receipts, or account numbers anywhere in the repo.

HOW TO WORK
- Plan first. Produce an implementation plan artifact and wait for my approval before editing code.
- Keep a task list artifact. Work in small commits with conventional messages.
- Use the project skills: /build-milestone, /new-endpoint, /new-table-with-rls, /build-screen,
  /security-review.
- Run tests, lint, type check, secret scan, and the relevant evals yourself. For web UI, use the browser
  to load the app and capture screenshots of the skeleton, empty, error, offline, and success states.
- Never disable or weaken a test, lint rule, or security check to get something passing. Fix the cause or ask.
- Do not invent provider page formats, hostnames, accuracy numbers, or library behavior. Say what is
  unknown and record it in docs/agent/MEMORY.md.
- Ask before: adding a runtime dependency to a core service, changing a shipped migration, changing a
  decision rule, storing a new category of personal data, adding a third-party service, deleting anything.

FIRST ACTIONS (in this order, then stop)
1. Read the source-of-truth documents.
2. Reply with (a) your understanding of the product and scope in at most 15 lines, (b) any conflicts,
   gaps, or risky assumptions you found in the docs, and (c) the questions you need answered before M1.
3. Then produce the Milestone 1 implementation plan artifact. Do not write code until I approve it.

AT THE END OF EVERY MILESTONE
Stop at a checkpoint and give me a walkthrough artifact: what changed, how it was tested with results,
what was not tested, risks, performance numbers, and exactly what I must do by hand (real phones, real
receipts, accounts, deployments). Do not start the next milestone until I approve.

[Optional: my machine is Windows/macOS/Linux. My phone for testing is ____.]
[Optional: hosting choice if already decided: ____.]
```

## 5. Per-milestone prompts

After the kickoff, use these. Each one calls the `/build-milestone` skill and adds the milestone's own conditions.

### Milestone 1: foundation

```text
/build-milestone M1
Scope: monorepo, lint and format, TypeScript strict, CI with the gates in docs/08-production-readiness.md,
Docker Compose (Postgres, Redis, API), migrations 0001 to 0003, synthetic seed data, auth (owner
registration, sign-in, refresh with rotation, cashier sign-in, PIN), the shared authorization layer, the
RLS foundation (roles, context functions, forced RLS and policies for every table created so far), rate
limiting middleware on all routes, the standard error shape with safe messages, the money and
shared-types packages, structured logging with request IDs, the secret scanner in pre-commit and CI.
Done when: an owner can register, create a branch and a cashier, the cashier can sign in and sees only
their branch, and the RLS, authorization, rate-limit, and error-leak tests pass.
```

### Milestone 2: catalog and cashier sale

```text
/build-milestone M2
Scope: products and barcodes (CRUD, CSV import with validation and preview), the cashier app (sign-in,
PIN, scan, cart, weighed items, search, cash payment, today's sales), local SQLite catalog cache and
sales outbox with idempotent sync, basic owner dashboard (sales list, today's totals) as a static
build. Every screen has a skeleton, empty, error, offline, and success state. Instant feedback on every
tap. Compressed responses and batched sync writes.
Done when: a cashier sells three items including a weighed one in under 45 seconds, sales appear on the
dashboard, and 50 offline sales sync once each with no duplicates.
```

### Milestone 3: provider lookup service (mock first)

```text
/build-milestone M3
Scope now: link validation and host allowlist, safe fetching (HTTPS only, safe redirects, private
address blocking, timeouts, size caps, no credentials), the mock provider server with every scenario in
docs/agent/EVALS.md section 2.1, the evidence contract, the link fuzzer, and the safe-fetch eval suite.
Build real provider parsers only if docs/agent/M0-FINDINGS.md exists. Otherwise stop and tell me.
Done when: all hostile-link tests pass, no request ever leaves the allowlist, and the mock covers every decision case.
```

### Milestone 4: saved accounts, decision engine, claims

```text
/build-milestone M4
Precondition: docs/agent/M0-FINDINGS.md exists and Assumption A1 is recorded.
Scope: saved payment accounts (PIN-protected changes, alerts, encrypted numbers), receiver matching,
the decision engine as a pure function with one test per decision row, the atomic claim with a
100-way concurrency test, the verify endpoint, owner override with PIN, alerts, WebSocket updates.
Done when: scenarios S1 to S16 in docs/agent/EVALS.md pass, and a real payment between two test accounts
verifies a sale end to end.
```

### Milestone 5: cashier payment experience

```text
/build-milestone M5
Scope: QR scan frame, verdict screen (Verified, Waiting, Rejected) with the reveal, haptics, and
reduced-motion behavior, the checking state as a verdict-shaped skeleton with a step list (no spinner),
automatic retry, enter-payment-ID fallback, override request, offline queueing of scanned QR text.
Never show Verified before the server decides.
Done when: a first-time user can complete a mobile-money sale with no help.
```

### Milestone 6: owner dashboard and multi-branch

```text
/build-milestone M6
Scope: branch, cashier, and saved payment account management, reports by branch, cashier, product, and
payment method for day, week, and month, alerts review, overrides, voids, CSV export with formula
protection. Static build. Skeletons for every widget. A failing widget never blocks the others.
Done when: an owner with three seeded branches can answer how much, what, where, and anything odd, in a minute.
```

### Milestone 7: hardening and delivery

```text
/build-milestone M7
Then run /security-review on the whole repository and /release-check.
Scope: full evaluation run with the held-out split, usability test script, load and failure tests,
dependency audit, backup and restore test, runbooks, demo data and APK builds, and the report numbers.
Done when: every Must requirement is demonstrated or listed as a limitation.
```

## 6. How to review what the agent produces

AI-written code is a draft. For a payments product, review it like a new teammate's first pull request.

**Every time**

- Read the plan before approving it. Does it match the requirement IDs and the milestone?
- Read the diff, not only the walkthrough. Look at authorization, SQL, and anything that touches money.
- Check that tests were really run and really cover the risk. Ask to see a failing test fail before it passes.
- Look for shortcuts: skipped tests, loosened lint rules, `any` types, `TODO` left in security code, hard-coded values.
- Search the diff for secrets and private URLs yourself.
- Confirm the walkthrough names what was **not** tested.

**Spot-check these on your own**

1. Sign in as a cashier of branch A and try to read branch B's sales, directly through the API.
2. Force an error (stop the database) and look at what the app shows.
3. Hit one route fast until it returns 429.
4. Open the built web bundle and the APK strings and search for anything that looks like a key.
5. Scan the same test receipt twice and confirm the second is rejected.
6. Turn on airplane mode, make three sales, reconnect, and count them on the dashboard.

## 7. Tips for working with the agent

- **One milestone at a time.** Big, vague prompts produce big, vague code.
- **Keep the docs current.** When a decision changes, change the doc first, then tell the agent to sync the code. The docs are the memory between sessions.
- **Use parallel agents carefully.** Parallel work suits independent pieces such as the mock provider server and the dashboard shell. Do not parallelize work that shares the database schema or the decision engine.
- **Commit often, and commit before each approved plan runs.**
- **Ask it to explain.** If you do not understand a piece of code, ask the agent to explain it. You must be able to defend this system to your advisor.
- **When it is wrong, correct the document or rule, not only the code,** so the mistake does not return.

## 8. If something goes wrong

| Symptom                                                 | Likely cause and fix                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A rule does not seem to apply                           | Missing or invalid frontmatter `trigger`, wrong folder depth (only direct children of `.agents/rules/` load), or the file is over 24 KB |
| The agent ignores the build gate or the stop conditions | Restate them in the conversation, and check `AGENTS.md` is at the workspace root                                                        |
| The agent invents a provider format                     | Stop it. Point at the M0 rule and give it the real facts through `/m0-findings`                                                         |
| Changes are too large to review                         | Ask for a smaller plan: one task, one commit                                                                                            |
| Tests pass but the app is wrong                         | Add a test that reproduces it first, then fix                                                                                           |
| It wants to add a library                               | Ask why, what it replaces, its size and maintenance status, and the alternatives                                                        |
