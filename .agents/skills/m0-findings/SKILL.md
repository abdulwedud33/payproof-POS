---
name: m0-findings
description: Turn the student's real receipt and QR observations into docs/agent/M0-FINDINGS.md and decide whether Assumption A1 holds. Use after the student pastes what their payment QR codes link to.
---

# Milestone 0 findings

Assumption A1: the payment QR links to an official provider receipt page our server can fetch and read.

## Steps

1. Ask the student for the redacted facts, never for real personal data: for each provider, the link host and path pattern (with ids removed), what the page shows (transaction ID, amount, time, status, receiver, masked or full), whether it needed a login, captcha, or JavaScript, how long the link works, and whether a plain script fetch returns the same data.
2. Do not fetch real receipt links yourself unless the student asks for that exact step.
3. Write `docs/agent/M0-FINDINGS.md`: per provider, the host (for the allowlist), the field list, parser notes, failure modes, rate and terms notes, and whether lookup by payment ID is possible.
4. Decide A1: **confirmed**, **partly true**, or **false**. If partly true or false, say which fallback from `docs/02-technical-requirements.md` section 4.8 applies and what changes in the plan.
5. Update `docs/agent/MEMORY.md` (A1 status, domain notes) and the open questions.
6. Create synthetic sample pages for the mock provider server in the same structure, with no real data.
