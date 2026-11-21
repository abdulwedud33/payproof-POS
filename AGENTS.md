# AGENTS.md

Instructions for AI coding agents working in this repository. Read this file first, every session.

## 0. The gate

> **Do not write application code until the project owner says "start building."**
> Until then you may read, plan, write or revise documents, schemas, and design files, and answer questions.
> After the gate opens, follow [docs/06-implementation-plan.md](docs/06-implementation-plan.md) milestone by milestone.
>
> **The gate is scoped.** When the owner opens it with the kickoff prompt in [docs/07-antigravity-playbook.md](docs/07-antigravity-playbook.md), it covers only the milestones that prompt names. Anything outside that scope, including real provider parsers before `docs/agent/M0-FINDINGS.md` exists, stays closed until the owner says otherwise.
> Stop at each milestone checkpoint and wait for approval.

## 1. What this project is

PayProof POS: a multi-branch supermarket point-of-sale where cashiers scan items and verify mobile-money payments (Telebirr, CBE) before completing a sale. Verification works by scanning the payment QR, fetching the transaction record from the provider's official receipt page, and matching its receiver to the branch's saved account. Owners manage branches and cashiers and see sales and fraud dashboards.

It is an ASTU senior project, built by the student and an AI agent working together.

## 2. Read before you build

| Order | File | Why |
|---|---|---|
| 1 | [docs/agent/MEMORY.md](docs/agent/MEMORY.md) | Current decisions, open questions, learnings |
| 2 | [docs/01-product-requirements.md](docs/01-product-requirements.md) | What and why |
| 3 | [docs/02-technical-requirements.md](docs/02-technical-requirements.md) | How |
| 4 | [docs/05-backend-schema.md](docs/05-backend-schema.md) | Data and integrity rules |
| 5 | [SECURITY.md](SECURITY.md) and [docs/agent/GUARDRAILS.md](docs/agent/GUARDRAILS.md) | Security rules and what must never happen |
| 6 | [DESIGN.md](DESIGN.md) | Before touching any UI |
| 7 | [docs/agent/EVALS.md](docs/agent/EVALS.md) | Before touching verification code |
| 8 | [docs/08-production-readiness.md](docs/08-production-readiness.md) | Before CI, deployment, or anything operational |
| 9 | `.agents/skills/` | Use the project skills (`/build-milestone`, `/new-endpoint`, `/new-table-with-rls`, `/build-screen`, `/security-review`) instead of improvising a process |

**Assumption A1** (the payment QR links to a readable provider page) is unconfirmed until Milestone 0 is done. Do not build on it silently. Check MEMORY.md for its current status.

## 3. Non-negotiable rules

1. **The provider record is truth.** A mobile-money sale becomes `paid` only if the provider's receipt page, fetched by our server from an allowlisted host, shows a successful payment to one of the branch's saved accounts for at least the total, and the transaction ID is claimed. A screenshot, an image, or anything displayed on the customer's phone never approves a sale. SMS and image checks are optional backup evidence and never approve a sale alone.
2. **Money is an integer in santim.** Never use floats for money. Use `packages/money`.
3. **Claims are atomic.** A transaction ID is consumed once, system-wide, inside one database transaction.
   **Fetching is guarded.** Only the verification service fetches external pages, only from the `provider_hosts` allowlist, over HTTPS, with timeouts and size limits, and never to private addresses.
4. **Every query is scoped** by `org_id`, and by `branch_id` for cashiers. Add a test for every new endpoint that tries to cross these boundaries.
5. **Completed sales are immutable.** Corrections happen through logged voids.
6. **Overrides, voids, deletes, and rejections write to the audit log.**
7. **No real customer data in the repo**: no real receipts, phone numbers, account numbers, or SMS text. Use synthetic data only. Real samples live outside git.
8. **No secrets in the repo.** Use environment variables and `.env.example`.
9. **Do not weaken a guardrail to make a test pass.** Fix the cause, or ask.

## 3a. Engineering and UX rules (also non-negotiable)

**Security** (details in [SECURITY.md](SECURITY.md))

1. **No secrets or keys in the frontend, the app, or any bundle.** Server environment only. Secret scanning runs on the repo, the web bundle, and the APK.
2. **Users access only authorized data.** Role, business, and branch are checked on every request.
3. **Backend and database rules are enforced.** Never rely on the client. Constraints, triggers, and RLS back up the API.
4. **Validate all input**, from users, files, QR codes, tools, and AI, on the server with Zod.
5. **Row-level security is on for every table, with policies written in the same migration as the table.**
6. **Rate limiting on every API endpoint.**
7. **Users never see backend errors.** Return a stable code, a safe message, and a reference ID.

**UX** (details in [DESIGN.md](DESIGN.md))

8. Apply Jakob's law, Hick's law, the law of proximity, Miller's law, and the Von Restorff effect wherever they fit.
9. **No spinners where the layout is known.** Use skeleton loaders that match the real screen. This applies across the whole app.
10. **Instant feedback.** Every button responds immediately, even if the process takes longer. Never show a money result as Verified before the server decides.
11. **No moving buttons during onboarding.** Reserve space for messages and loading states.
12. Use smart defaults, the goal gradient, reciprocity, the endowment effect, and loss aversion honestly, never to trick or pressure anyone.
13. Keep it simple, consistent, and clearly ordered by visual hierarchy.

**Speed** (details in [TRD speed rules](docs/02-technical-requirements.md))

14. No uncompressed JSON. Lean payloads.
15. No illogical database writes: batch, transact, upsert, and never write in loops.
16. No single dependency bottleneck. Degrade gracefully when a provider or service is down.
17. Optimistic rendering for everything except money verdicts.
18. The owner web app is hosted statically.

## 4. Repository layout

```
apps/cashier-app      React Native, TypeScript
apps/owner-web        Next.js, TypeScript
apps/sms-companion    Kotlin (Android), optional backup evidence
apps/api              Node.js, TypeScript
services/verification Python, FastAPI (provider lookup and parsing)
services/mock-provider Fake provider receipt pages for dev and tests
packages/shared-types Zod schemas and shared types
packages/money        Integer money helpers
packages/ui-tokens    Design tokens
db/migrations         SQL migrations
evals/                Evaluation harness and synthetic data
docs/                 Project documentation
```

## 5. Commands

These are created in Milestone 1. Keep this section accurate as they change.

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Start local stack | `docker compose up -d` |
| Run API in dev | `pnpm --filter api dev` |
| Run web in dev | `pnpm --filter owner-web dev` |
| Run all TS tests | `pnpm test` |
| Lint and typecheck | `pnpm lint && pnpm typecheck` |
| Secret scan | `pnpm scan:secrets` (repo, web bundle, APK) |
| RLS and policy tests | `pnpm test:rls` |
| Migrate database | `pnpm db:migrate` |
| Seed synthetic data | `pnpm db:seed` |
| Verification service tests | `cd services/verification && pytest` |
| Run evals | `pnpm evals:run` |

## 6. Conventions

**TypeScript**
- `strict` mode on. No `any` without a comment explaining why.
- Validate every external input with Zod at the boundary. Share schemas through `packages/shared-types`.
- Errors use the standard shape `{ error: { code, message, details } }`. Codes are `UPPER_SNAKE_CASE` and listed in `shared-types`.
- Functions are small and named for what they do. Business rules live in services, not controllers.

**Python**
- Type hints everywhere, `ruff` and `mypy` clean.
- The verification service returns *evidence*, never a sale decision.

**Database**
- Migrations are forward-only SQL files. Never edit a migration that has been applied.
- Add the index when you add the query.

**Git**
- Small commits in the form `type(scope): summary`, for example `feat(api): claim payment atomically`.
- One milestone per branch. Do not mix refactors with features.

**UI**
- Use tokens from `packages/ui-tokens`. No raw hex values or magic spacing in components.
- Every user-facing string goes through the translation layer.
- Every state has an icon and a word as well as a color.

## 7. Testing expectations

| Change | Needs |
|---|---|
| New endpoint | Success test, validation failure test, authorization test, cross-branch test |
| Money or totals logic | Unit tests including rounding and large values |
| Parser (provider page, and SMS if built) | Table-driven tests with synthetic samples served by the mock provider, plus malformed input |
| Link handling | Tests with hostile links: wrong host, lookalike host, redirects off the allowlist, private addresses, huge responses |
| Decision rules | A test per row of the decision table in the TRD |
| Claim logic | A concurrency test with two simultaneous claims of the same ID |
| Sync | A test that uploads the same sale twice |
| UI screen | A render test for each state (including its skeleton), and a check against DESIGN.md tokens |
| New table | RLS enabled and forced, policies written, and a policy test for every role |
| Any endpoint | A rate-limit test and an error-leak test |
| Onboarding screens | A layout-shift check showing nothing moves |

## 8. Definition of done

Use the checklist in [docs/06-implementation-plan.md](docs/06-implementation-plan.md#6-definition-of-done-every-task). A task is not done when the code compiles. It is done when it is tested, scoped, logged, and documented.

## 9. Working style

- Make the smallest change that fully solves the task.
- When a requirement is ambiguous or two docs disagree, **ask** instead of guessing, and record the answer in MEMORY.md.
- State risks and limitations plainly. If verification is unreliable somewhere, say so.
- Prefer boring, well-known solutions. This project's depth is in verification and correctness, not in novelty.
- After each milestone, summarize what changed, what was tested, what remains, and what the student must do (real phones, real samples, visits).
- Update [docs/agent/MEMORY.md](docs/agent/MEMORY.md) when a decision is made or a surprise is learned.

## 10. Ask first

Stop and ask the student before you:
- Add a new runtime dependency to a core service
- Change the database schema after a migration shipped
- Change a decision rule in the verification logic
- Add a host to the provider allowlist
- Store any new category of personal data
- Add a new third-party service or network call
- Add a table, or change a policy, without its RLS policies
- Delete files, data, or branches
