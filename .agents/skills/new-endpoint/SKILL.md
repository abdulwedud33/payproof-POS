---
name: new-endpoint
description: Add or change an API endpoint in apps/api with validation, authorization, rate limiting, audit logging, error mapping, and the required tests. Use for any new or changed route.
---

# New endpoint

Input: method, path, the requirement ID, and which roles may call it.

## Steps

1. Read the relevant parts of `docs/02-technical-requirements.md` (API design) and `docs/05-backend-schema.md`.
2. Add the Zod request and response schemas to `packages/shared-types`. Reject unknown fields.
3. Declare the route's allowed roles in the shared authorization module. A route without a declared policy must fail to start.
4. Scope every query by business, and by branch for cashiers. Use the request transaction that sets the RLS context.
5. Choose the rate limit class from `SECURITY.md` section 8 and configure it (limits live in configuration, shared across instances).
6. Return the standard error shape. Map internal errors to safe codes and messages. Never return internal detail.
7. If it changes state: write an audit log entry, support the `Idempotency-Key` header, and keep writes in one transaction.
8. Keep the response lean and compressed. Use cursor pagination for lists.
9. Tests: success, validation failure, unauthenticated, wrong role, cross-branch, cross-business, rate limit exceeded, error does not leak internals.
10. Update the endpoint table in `docs/02-technical-requirements.md` if it is new.
