# PayProof POS

> Multi-branch supermarket point-of-sale with real-time mobile-money payment verification.
> *Working name. Rename it anywhere with a global find-and-replace.*

| | |
|---|---|
| **Status** | Planning. Documentation only. No application code yet. |
| **Context** | ASTU senior (BSc) project, Computer Science and Engineering |
| **Builders** | The student and Claude, working together |
| **Doc version** | 0.1, 24 Oct 2026 |

## The one-paragraph pitch

Supermarkets in Ethiopia take Telebirr and CBE payments, but the cashier has to decide by eye whether a payment screenshot is genuine. Receipts get edited, reused, or shown for money that never arrived, and small shops cannot get bank API access. PayProof POS lets a cashier scan items, total the cart, and **verify the customer's payment before the sale closes**: the cashier scans the payment QR, the system fetches the record from the provider's official receipt page, and checks that the receiver matches the branch's saved account, the amount covers the total, and the payment was never used before. Owners manage branches and cashiers and see sales, income, and fraud alerts for every branch.

## Ground rules

1. **No application code until the owner of this project says "start building."** Documentation, schemas, and design work are fine before that.
2. **The provider's own record is the source of truth.** The system fetches it itself from an allowlisted provider address. A screenshot, a photo, or anything displayed on the customer's phone is never proof on its own.
3. **Money is stored as integers** (santim, so 1 Birr = 100). No floats, ever.
4. **Every override, void, and rejection is logged** with who did it and why.
5. **Nothing secret ships to a client.** Every table has row-level security, every API is rate limited, and all input is validated on the server. See [SECURITY.md](SECURITY.md).
6. **Skeletons, not spinners, and instant feedback on every tap.** The one exception to optimistic screens is money: Verified is shown only after the server decides.
7. **Users never see backend errors.** They see a plain message and, when useful, a short reference code.

## Document map

| # | Document | What it answers | File |
|---|---|---|---|
| 1 | Product requirements | What are we building, for whom, and how do we know it worked? | [docs/01-product-requirements.md](docs/01-product-requirements.md) |
| 2 | Technical requirements | How is it built, and why this way? | [docs/02-technical-requirements.md](docs/02-technical-requirements.md) |
| 3 | App flow | What does each user do, screen by screen and state by state? | [docs/03-app-flow.md](docs/03-app-flow.md) |
| 4 | UI/UX design brief | What should it feel like at a busy checkout counter? | [docs/04-uiux-design-brief.md](docs/04-uiux-design-brief.md) |
| 5 | Backend schema | What is stored, and what keeps it correct? | [docs/05-backend-schema.md](docs/05-backend-schema.md) |
| 6 | Implementation plan | In what order do we build it, and when is each part done? | [docs/06-implementation-plan.md](docs/06-implementation-plan.md) |
| 7 | AGENTS.md | How should an AI coding agent behave in this repo? | [AGENTS.md](AGENTS.md) |
| 8 | TOOLS.md | Which tools and commands may be used? | [docs/agent/TOOLS.md](docs/agent/TOOLS.md) |
| 9 | MEMORY.md | What have we decided, learned, and left open? | [docs/agent/MEMORY.md](docs/agent/MEMORY.md) |
| 10 | EVALS.md | How do we measure that verification actually works? | [docs/agent/EVALS.md](docs/agent/EVALS.md) |
| 11 | GUARDRAILS.md | What must never happen, and how do we prevent it? | [docs/agent/GUARDRAILS.md](docs/agent/GUARDRAILS.md) |
| 12 | PROMPTS.md | Reusable prompts for repeatable build tasks | [docs/agent/PROMPTS.md](docs/agent/PROMPTS.md) |
| 13 | DESIGN.md | Design tokens, components, voice, UX laws, and loading behavior | [DESIGN.md](DESIGN.md) |
| 14 | SECURITY.md | What are the security rules, and how are they tested? | [SECURITY.md](SECURITY.md) |
| 15 | Antigravity playbook | How do I build this with Google Antigravity, and what do I paste? | [docs/07-antigravity-playbook.md](docs/07-antigravity-playbook.md) |
| 16 | Production readiness | What must be true before real shops use it? | [docs/08-production-readiness.md](docs/08-production-readiness.md) |

## Building with Google Antigravity

Open this folder as the workspace. Antigravity loads `AGENTS.md` and `GEMINI.md` automatically, the focused rules in `.agents/rules/`, and the project skills in `.agents/skills/`. Then follow [docs/07-antigravity-playbook.md](docs/07-antigravity-playbook.md): it has the setup steps, the kickoff prompt to paste, and a prompt for each milestone.

```
payproof/
├── AGENTS.md  GEMINI.md  DESIGN.md  SECURITY.md  README.md
├── .agents/
│   ├── rules/   security, database, ui-ux, verification, testing, performance
│   └── skills/  build-milestone, new-endpoint, new-table-with-rls, build-screen,
│                security-review, m0-findings, release-check
├── docs/        01 to 08, plus agent/ (TOOLS, MEMORY, EVALS, GUARDRAILS, PROMPTS)
├── .env.example  .gitignore
```

## Suggested reading order

New to the project: this README, then 1, 3, 4. Building: 7, 2, 5, 6, 14, then 10 and 11 before touching verification code. **Assumption A1** (the payment QR links to a readable provider page) must be confirmed in Milestone 0.

## Glossary

| Term | Meaning |
|---|---|
| **Verdict** | The result of payment verification: Verified, Waiting, or Rejected. |
| **Payment QR** | The QR code on the customer's receipt that links to the provider's official receipt page. |
| **Provider record** | The transaction details the system reads from the provider's receipt page: ID, amount, time, status, receiver. |
| **Receiver match** | Checking that the receiver on the provider record is one of the branch's saved payment accounts. |
| **Saved payment account** | The owner's receiving account for a branch: provider, holder name, and number. |
| **Backup evidence** | Optional SMS and receipt-image checks. They add warnings but never verify a sale alone. |
| **Claim** | Marking a transaction ID as used by exactly one sale. A claim cannot be undone without an owner override. |
| **Branch** | One physical store location. Each branch has its own cashiers and payment accounts. |
