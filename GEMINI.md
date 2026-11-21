# GEMINI.md

Antigravity-specific operating rules for PayProof POS. `AGENTS.md` still applies in full. If anything here conflicts with it, the stricter rule wins.

## How to work in Antigravity

1. **Plan first.** For any task bigger than a one-file change, produce an implementation plan artifact and wait for approval before editing code. Name the requirement IDs and the milestone it serves.
2. **Keep a task list.** Maintain a task list artifact with small, checkable items. Update it as you go.
3. **Verify, do not assume.** Run the tests, linters, type checks, and the relevant eval suite yourself. For the web dashboard, use the browser to load the page, exercise the flow, and capture screenshots of each loading, empty, error, and success state.
4. **Finish with a walkthrough.** End each task with a walkthrough artifact: what changed, how it was tested, what was not tested, risks, and what the student must do by hand (real phones, real receipts, accounts, deployments).
5. **Stop at checkpoints.** Each milestone ends at a checkpoint. Do not start the next milestone until the student approves.
6. **Small, reviewable changes.** One concern per change. No drive-by refactors.
7. **Use the skills.** Prefer the project skills in `.agents/skills/` (for example `/build-milestone`, `/new-endpoint`, `/new-table-with-rls`, `/build-screen`, `/security-review`) over improvising a process.

## Terminal and browser

- Use the terminal for installs, tests, builds, and the local Docker stack.
- Never run destructive commands outside the project folder. Never force-push. Never run migrations against anything except the local development database unless the student says so in this conversation.
- Never paste secrets into the terminal, the browser, or a prompt. Use environment variables.
- Use the browser only for the local app, documentation, and the mock provider server. Do not open real provider receipt links, real accounts, or real payment pages unless the student asks for that exact step.

## Truthfulness

- Do not claim something works until you have run it.
- Do not invent provider page formats, hostnames, accuracy numbers, or library behavior. Say what is unknown and add it to `docs/agent/MEMORY.md`.
- Assumption A1 (the payment QR links to a readable provider page) is unconfirmed until `docs/agent/M0-FINDINGS.md` says otherwise.
