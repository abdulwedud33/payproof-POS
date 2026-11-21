---
name: release-check
description: Run the production readiness checklist from docs/08-production-readiness.md before a demo, release, or deployment.
---

# Release check

1. Read `docs/08-production-readiness.md` and `SECURITY.md`.
2. Run the full test suite, lint, type check, secret scan, dependency audit, RLS tests, rate-limit tests, and the evals. Record results.
3. Check the environment: no secrets in git or bundles, production values only in the secrets manager, migrations applied in order, backups configured and a restore tested.
4. Check observability: logs with request IDs, health endpoints, alerts configured.
5. Check the web build is static, assets are hashed and cached, headers and CSP are set, and responses are compressed.
6. Produce a release report artifact with pass or fail for each item, and a go or no-go recommendation with reasons. The student decides.
