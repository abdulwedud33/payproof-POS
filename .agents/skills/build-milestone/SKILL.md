---
name: build-milestone
description: Build one milestone (M1 to M7) of PayProof POS from the implementation plan, with a plan, tests, evals, a walkthrough, and a checkpoint. Use when the student says to start or continue a milestone, for example "/build-milestone M2".
---

# Build a milestone

Input: a milestone ID such as M1, M2, M3. If none is given, read `docs/agent/MEMORY.md` and propose the next one.

## Steps

1. **Read.** `AGENTS.md`, `docs/agent/MEMORY.md`, `docs/06-implementation-plan.md` (the milestone), `docs/01-product-requirements.md` (the requirement IDs it covers), `docs/02-technical-requirements.md`, `docs/05-backend-schema.md`, `SECURITY.md`, `DESIGN.md` (for UI work), and `docs/agent/EVALS.md` (for verification work).
2. **Check preconditions.**
   - M3 real parsers and M4 final decision rules need `docs/agent/M0-FINDINGS.md`. If it does not exist, build only against the mock provider and say so.
   - Do not start a milestone whose predecessor has no approved checkpoint.
3. **Plan.** Produce an implementation plan artifact: tasks of at most half a day, files touched, requirement IDs, tests, risks, and what you need from the student. Wait for approval.
4. **Build task by task.** After each task run tests, lint, type check, and the secret scan. Keep commits small with conventional messages.
5. **Enforce the project rules while building.** RLS on every new table, rate limit on every new route, input validation at every boundary, no secrets in clients, skeletons not spinners, instant feedback, no backend errors shown, compressed JSON, sensible writes.
6. **Run the evals** that apply (safe fetch, parsing, receiver matching, decisions, concurrency, RLS, rate limits).
7. **Verify in the browser or an emulator** where there is a UI. Capture screenshots of skeleton, empty, error, offline, and success states.
8. **Update docs.** `docs/agent/MEMORY.md` (decisions, learnings, session log) and any doc that no longer matches the code.
9. **Walkthrough artifact.** What changed, how it was tested with results, what was not tested, risks, performance numbers, and **what the student must do by hand**.
10. **Stop at the checkpoint.** Do not begin the next milestone.

## Done when

The milestone's "Done when" line in the plan is demonstrably true, and the definition of done in `docs/06-implementation-plan.md` section 6 is fully ticked.
