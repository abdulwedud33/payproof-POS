---
trigger: glob
globs: "services/verification/**, services/mock-provider/**, apps/api/src/**/payments/**, apps/api/src/**/verification/**"
description: "Payment verification: QR links, provider page fetching, parsing, receiver matching, the decision engine, and claims."
---

# Verification rules

Pipeline and decision table: @../../docs/02-technical-requirements.md (section 4). Evaluation: @../../docs/agent/EVALS.md. Threats: @../../docs/agent/GUARDRAILS.md.

1. The provider record is the truth, fetched by our server from an allowlisted host. Never trust what the customer's phone shows.
2. Only the verification service fetches external pages. HTTPS only, host allowlist, redirects stay on the allowlist, no private or loopback addresses (also after DNS resolution), short timeouts, size caps, no cookies or credentials.
3. Parsers are table-driven and fail safely. A parser that cannot read a page returns an error. It never guesses.
4. The service returns evidence only. It has no database access and cannot change a sale.
5. The decision engine is a pure function with one test per row of the decision table. Backup evidence (SMS, image checks) may add warnings and never decides.
6. The claim is one transaction: insert into `consumed_payments`, set the verification to verified, set the sale to paid. A duplicate rolls back everything. Test with 100 simultaneous claims.
7. Receiver matching uses the branch's saved accounts, requires every identifier the page shows to agree, and treats near matches as warnings, not matches.
8. Do not invent provider formats or hostnames. Until `docs/agent/M0-FINDINGS.md` exists, build against the mock provider only and record what is unknown.
9. When unsure, the verdict is Waiting, never Verified.
