---
trigger: model_decision
description: 'Apply whenever writing or reviewing authentication, authorization, API endpoints, input handling, error handling, secrets or config, file or link handling, rate limiting, logging, or anything that touches money or personal data.'
---

# Security rules (PayProof POS)

Full rules: @../../SECURITY.md. Threats and agent rules: @../../docs/agent/GUARDRAILS.md. Read them before changing anything above.

Non-negotiables:

1. **No secrets or keys in the frontend, mobile app, or web bundle.** Apps hold only the public API base URL and public flags. Server secrets come from environment variables. Never commit `.env`.
2. **Users reach only authorized data.** Every route declares its allowed roles. Every query is scoped by business, and by branch for cashiers. Test the cross-boundary case.
3. **Rules are enforced on the server and in the database**, never only in the app.
4. **Row level security is enabled and forced on every table, with written policies.** The API uses a role that cannot bypass it.
5. **Validate all input** (users, devices, QR text, files, provider pages, AI or tool output) with Zod or equivalent at every boundary. Parameterized queries only.
6. **Rate limit every route**, return 429 with `Retry-After`, and test the limit.
7. **Never show backend errors to users.** Log the detail with a request ID, return a safe code and message.
8. **Only the verification service fetches external pages**, only from the host allowlist, over HTTPS, with limits.
9. **A mobile-money sale becomes paid only from a successful provider record, a receiver match, and an atomic one-time claim.** Never from the client, an image, or an SMS alone.
10. **Money is an integer in santim.** Never floats.
11. Sensitive actions (override, void above the limit, changing a saved payment account) need the owner's PIN and write an audit entry.
12. No real customer data, receipts, or account numbers in git, fixtures, logs, or screenshots.
