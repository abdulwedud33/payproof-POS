---
trigger: model_decision
description: 'Apply when writing tests, fixing bugs, finishing a task, or deciding whether work is done.'
---

# Testing rules

Expectations: @../../AGENTS.md (sections 7 and 8) and @../../docs/agent/EVALS.md.

1. New endpoint: success, validation failure, unauthorized, forbidden, cross-branch, cross-business, rate-limit tests.
2. New table: an RLS test proving other businesses and other branches see nothing, and that missing context returns nothing.
3. Money and totals: unit tests including rounding, large values, and one santim edge cases.
4. Decision rules: one test per row of the decision table.
5. Claim logic: a concurrency test with simultaneous claims.
6. Sync: a test that uploads the same sale twice.
7. UI: a render test for each state (skeleton, empty, error, offline, success) and a check that tokens are used.
8. Never disable, skip, or weaken a test, lint rule, or authorization check to make something pass. Fix the cause or ask.
9. A task is done only when tests pass, lint and type checks pass, the secret scan is clean, docs and `docs/agent/MEMORY.md` are updated, and the walkthrough lists what was not tested.
