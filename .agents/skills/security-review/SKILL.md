---
name: security-review
description: Review a change or the whole codebase against SECURITY.md and GUARDRAILS.md, including secrets in clients, authorization, RLS, validation, rate limits, error leakage, and safe fetching. Use before merging a milestone or when asked to audit.
---

# Security review

Input: a diff, a folder, or "everything".

## Checklist (answer yes, no, or not applicable, with evidence for each)

1. Is there any secret, key, or private URL in the mobile app, web bundle, or repo? Run the secret scanner and inspect the built bundle and APK strings.
2. Does every route declare allowed roles, and is every query scoped by business and branch?
3. Is row level security enabled and forced on every table with written policies, and do tests prove cross-business and cross-branch isolation and fail-closed behavior?
4. Is all input validated at every boundary (users, devices, QR text, files, provider pages, AI or tool output)? Any string-built SQL?
5. Does every route have a rate limit with tests, and does 429 include `Retry-After`?
6. Force failures. Does any internal detail (stack trace, SQL, paths, provider response) reach a client?
7. Can a mobile-money sale become paid without a provider record, a receiver match, and an atomic claim?
8. Does any fetch go anywhere but an allowlisted provider host? Run the hostile-link set.
9. Are sensitive actions PIN-protected and audit-logged? Is the audit log append-only?
10. Is anything personal logged or stored beyond need? Real data in fixtures or git?
11. Tokens: secure storage on mobile, in-memory access token and HttpOnly refresh cookie on web?
12. Headers, CORS, CSP for the static dashboard. Dependency audit results.

## Output

A report artifact with findings ranked by severity, each with evidence, a concrete fix, and a test that would prove it. Do not fix silently: list the findings, then fix the ones the student approves.
