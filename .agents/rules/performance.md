---
trigger: model_decision
description: 'Apply when designing API responses, database writes, sync, caching, hosting, or anything about speed.'
---

# Performance rules

Targets and build rules: @../../docs/02-technical-requirements.md (section 9, Speed rules).

1. **No uncompressed JSON.** Brotli or gzip on responses over about 1 KB. Gzip batched request bodies from the app. Lean payloads, cursor pagination, IDs instead of nested objects, delta sync for the catalog.
2. **No illogical database writes.** One transaction per sale, batched inserts, no writes in loops, idempotent upserts, no writes on read paths.
3. **No single dependency bottleneck.** Cash sales never depend on a provider. Provider calls have timeouts, a circuit breaker, queued retries, and cached results. Stateless services that can run as copies.
4. **No un-optimistic rendering.** Update the UI first and reconcile. Never for payment verdicts.
5. **Statically hosted web.** The owner dashboard is a static build on a CDN. No server-side rendering. Data comes from the API after load.
6. Skeletons instead of spinners. No layout shift.
7. Measure before and after, and record numbers in the walkthrough.
