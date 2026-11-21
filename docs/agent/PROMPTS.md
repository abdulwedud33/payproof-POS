# PROMPTS.md

Reusable prompts for repeatable work on this project. Copy one, fill the `{placeholders}`, and send it. Each prompt assumes the agent reads [AGENTS.md](../../AGENTS.md) first.

> **Gate reminder:** prompts that produce application code only apply after the student has said "start building."

## How to use these

- Start each session with the **Session start** prompt.
- Give one task at a time, tied to a requirement ID or milestone.
- End each session with the **Session close** prompt so MEMORY.md stays current.

---

## 1. Session start

```
Read AGENTS.md and docs/agent/MEMORY.md. Then tell me in under 10 lines:
- where we are (current milestone and what is done),
- the next 3 tasks,
- any open questions that block them.
Do not write code yet.
```

## 2. Session close

```
Update docs/agent/MEMORY.md: add any decisions made, learnings, new open questions,
and a one-line session log entry. Then summarise:
- what changed,
- what was tested and the results,
- what is not done or not tested,
- what I must do myself (real phones, samples, visits).
```

---

## 3. Planning and requirements

### Clarify a requirement
```
Requirement {FR-id} in docs/01-product-requirements.md says: "{text}".
List the ambiguities, the options for each, and the risk of each option.
Recommend one and say what you would need from me to confirm it.
Do not change any file yet.
```

### Break a milestone into tasks
```
Take milestone {M#} from docs/06-implementation-plan.md and break it into tasks of at most half a day.
For each task give: goal, files likely touched, tests needed, requirement IDs covered,
and what could block it. Order them so something demonstrable exists as early as possible.
```

---

## 4. Backend

### New endpoint
```
Implement {METHOD /v1/path} for requirement {FR-id}.
Follow docs/02-technical-requirements.md and docs/05-backend-schema.md.
Include: Zod request and response schemas in packages/shared-types, the handler,
scoping by org and branch, the standard error shape, audit logging if it changes state,
and tests: success, validation failure, unauthorized, forbidden, and cross-branch attempt.
Also: put it in a rate-limit class from SECURITY.md section 8 and test that exceeding it returns 429,
write queries that work under row-level security as the application role (never bypass it),
map failures to stable error codes with safe messages and a reference ID (no backend detail in any response),
keep the response lean and compressible, and write rows in batches inside one transaction, never in a loop.
Run the tests and show me the results.
```

### New migration
```
Write migration {NNNN_name} that {purpose}, matching docs/05-backend-schema.md.
Forward-only SQL. Enable and force row-level security on every new table and write its policies in the same migration, with tests for each role. Include indexes for the queries it supports, constraints that enforce
the integrity rules, and a rollback note. Show the exact SQL and test it on a fresh database
and on a database with seed data.
```

### Atomic payment claim
```
Implement the payment claim as a single database transaction:
insert into consumed_payments, set the verification verdict to verified, set the sale to paid.
A duplicate must roll back everything. Write a concurrency test that fires 100 simultaneous
claims of the same transaction ID from two branches and asserts exactly one succeeds.
```

### Decision engine
```
Implement the decision rules from section 4.4 of docs/02-technical-requirements.md as a pure function:
(provider record, saved accounts, sale total, claim state, now) -> verdict, reason.
Write one table-driven test per row of the decision table, plus edge cases: equal amount, one santim short,
large amounts, missing fields, near-match receiver names, payment exactly at the time-window edge.
Backup evidence may add warnings but must never change the verdict. Show me the test table.
```

## 5. Verification service

### Provider parser
```
Write the parser for the {provider} receipt page. Use only the synthetic samples in evals/data/synthetic/{provider}/
and the field list recorded in docs/agent/MEMORY.md from Milestone 0.
Return {field: value} for transaction ID, amount, time, status, receiver name, receiver account or phone (masked), payer (masked).
The parser is table-driven so a layout change means a data change, not a code change.
If a required field is missing or the layout is unrecognised, fail safely with a clear error. Never guess.
Add tests for malformed input and a changed layout. List what you still need from real samples.
```

### Safe fetching
```
Implement fetching of the QR link in the verification service.
Allow only HTTPS URLs whose host is in the provider_hosts allowlist. Follow redirects only if every hop stays on the list.
Refuse private, loopback, and link-local addresses, including after DNS resolution.
Set short timeouts, a response size cap, a content-type check, and send no cookies or credentials.
Write tests with the hostile link set in evals: lookalike hosts, redirects off the list, internal addresses,
huge and slow responses. Show me the results and confirm no request left the allowlist.
```

### Run and summarise evals
```
Run pnpm evals:run --suite {suite} (safe_fetch, parsing, receiver, decisions, concurrency, or all). Compare against the last report in evals/reports.
Summarise using the template in docs/agent/EVALS.md. List the 10 worst failures with causes,
and tell me honestly whether any target is missed.
```

---

## 6. Mobile and companion

### Cashier screen
```
Build the "{screen}" screen from docs/03-app-flow.md and docs/04-uiux-design-brief.md.
Use only tokens from packages/ui-tokens and components from DESIGN.md.
Cover every state: loading, empty, error, offline, and success.
Text goes through the translation layer. Touch targets 48 px or more.
Add render tests for each state and Maestro steps for the flow.
Also: data loading shows a skeleton that matches the final layout (no spinner where the layout is known),
every control responds within 100 ms and keeps its size and place while working, updates are optimistic
except money verdicts (never show Verified before the server decides), errors use the friendly messages
from docs/04-uiux-design-brief.md section 16, and no secret or technical error text appears in the UI.
Apply Jakob's, Hick's, proximity, Miller's, and Von Restorff where they fit, and name where you did.
```

### Offline outbox
```
Implement the sales outbox on the device: save each sale locally with a UUID v7 and idempotency key,
upload with exponential backoff, mark synced on server acknowledgement.
Tests: 50 offline sales then reconnect, kill the app mid-sync, double upload of the same sale.
Show the sync status banner states from DESIGN.md.
```

### Receiver matching
```
Implement receiver matching: given a provider record and the branch's saved payment accounts,
return match, near-match (warn), or no match. Normalize names (case, spacing, punctuation, common transliterations).
Use all identifiers the page shows, and require them to agree. Use the receiver matching set in EVALS.md.
Report false accepts and false rejects. A look-alike must never match.
```

### SMS companion parser (optional backup evidence)
```
Only if the SMS backup is being built. Implement SMS filtering and parsing in the Kotlin companion for {provider}.
Accept only the configured sender IDs. Ignore and store nothing for everything else.
Output {provider, txnId, amount, eventTime, counterpartyMasked, rawSha256, parseConfidence}.
Unit-test against synthetic messages including malformed, duplicate, and spoofed-sender cases.
```

---

## 7. Web dashboard

```
Build the owner dashboard "{section}" per docs/03-app-flow.md section 9.
Use DESIGN.md tokens and the summary stat, data table, and chart card components.
Numbers are right-aligned tabular figures. Provide today, week, and month ranges, and a branch filter.
Add an empty state and an error state. Include keyboard navigation and visible focus.
Queries come from the reporting views in docs/05-backend-schema.md.
The dashboard is a static export hosted on a CDN: no server-side rendering and no secrets in the bundle.
Use skeletons that match each block, keep the initial script small, and show friendly errors only.
```

---

## 8. Design

### Critique a screen
```
Review this screen against docs/04-uiux-design-brief.md and DESIGN.md.
Check: contrast, touch targets, states, microcopy, hierarchy, whether the main action is obvious
in one second, and whether color is the only signal. Give findings ranked by severity
with a concrete fix for each. Do not rewrite everything.
```

### Microcopy
```
Write the text for {screen/state}. Follow the voice rules in DESIGN.md section 8:
plain verbs, sentence case, say what happened and what to do next, no apology or blame.
Give the translation keys and English text, and note any words that may not translate well.
```

---

## 9. Review and security

### Code review
```
Review this change against docs/agent/GUARDRAILS.md section 8.
Answer each checklist question with yes, no, or not applicable and the evidence.
List anything that could let a sale become paid without a provider record, a receiver match, and a claim,
let a fetch go to a host outside the allowlist, or let a user cross a business or branch boundary.
```

### Authorization matrix
```
Generate an authorization test matrix: every endpoint against owner, cashier at branch A,
cashier at branch B, suspended cashier, and unauthenticated. Expected result for each cell.
Implement it as one parameterised test and run it. Report any cell that fails.
```

### Threat check
```
Pick the feature "{feature}". Walk through the threat table in docs/agent/GUARDRAILS.md.
Which threats apply, what is the current mitigation in code, what is missing, and what test would prove it?
```

---

## 10. Documentation and thesis

### Sync docs
```
Compare the current code with docs/02-technical-requirements.md and docs/05-backend-schema.md.
List every place they disagree. For each, say which should change and why.
Do not edit until I choose.
```

### Thesis section
```
Draft the thesis section "{section}" from the project docs and the latest eval report.
Use plain language and cite specific numbers from the report. State limitations honestly.
Mark every claim you cannot support from the repo with [NEEDS EVIDENCE].
```

### Proposal difference paragraph
```
Using the past-project list I will paste below, write an 80 to 150 word paragraph on how this project
differs from the closest one. Name that project and be specific. Do not claim differences you cannot see in the list.
```

---

## 11. Security, UX, and speed checks

### RLS for a new table
```
Table {name} was added. Enable and force row-level security, and write policies for select, insert, update,
and delete based on app.org_id, app.role, app.branch_ids, and app.user_id (see docs/05-backend-schema.md section 7).
Default deny. Then write tests that run as the application role for owner, cashier at the branch, cashier at another branch,
another business, and no context. Show me the matrix and any cell that fails.
```

### Secrets and client bundle check
```
Scan the repo, the built web bundle, and the Android build output for secrets, keys, and any value from the server .env.
Check that no private setting uses a public-prefixed variable name. Report each finding with its file and how to fix it.
If anything was ever committed, say which secret to rotate first.
```

### Error leakage check
```
Force these failures: database unreachable, a query error, a provider timeout, invalid input, an oversized body, and a rate-limit hit.
For each, show me exactly what the client receives and what the user sees. Fail the check if any response or screen shows a stack trace,
SQL, table or column names, internal IDs, file paths, or raw server text.
```

### Rate limit for a route
```
Add rate limiting to {METHOD /v1/path}. Pick the route class from SECURITY.md section 8 and key it by
user, device, and IP as that class says. Limits live in configuration and are shared across API instances.
Over the limit returns 429 with Retry-After, and the app shows a plain wait message, never the raw error.
Write tests that exceed the limit, check the retry hint, and confirm normal use is unaffected.
Show me the limit you chose and why.
```

### Skeleton and feedback pass
```
List every screen that loads data. For each, show its skeleton (matching the final layout), what happens while loading,
offline, and on error, and the time to first feedback when a control is tapped.
Flag any spinner used where the layout is known, any control that changes size or position while working,
and any optimistic update that shows a money result before the server decides.
```

### Speed review
```
Review {feature} for: uncompressed or oversized JSON, N+1 queries, writes in loops, missing indexes,
repeated reads, work that blocks the request and could be queued, a single dependency that can stop the shop,
and anything on the dashboard that needs a server at runtime. Show query counts and payload sizes before and after.
```

## 12. If the project ever adds an LLM feature

The core product uses no language model. If one is added later (for example, to summarise a day's alerts), start from this and treat it as a guardrail review item:

```
The feature may only read {named fields}. It must not receive receipt images, phone numbers,
account numbers, or raw SMS text. Its output is advisory text and cannot change a sale, an alert
status, or any record. Log the prompt template version, never the personal content.
Add an eval with {N} cases covering wrong, missing, and adversarial inputs.
```
