---
trigger: glob
globs: "**/*.sql, db/**, **/migrations/**"
description: "Database migrations, schema, row level security policies, and SQL."
---

# Database rules

Schema and policies: @../../docs/05-backend-schema.md. Security rules: @../../SECURITY.md.

1. Migrations are forward-only SQL. Never edit an applied migration. For risky changes use expand and contract.
2. **Every new table gets `ENABLE` and `FORCE ROW LEVEL SECURITY` and written policies in the same migration**, plus a restrictive business-isolation policy when it has `org_id`. Add a test that proves another business and another branch see nothing.
3. The API role is `NOBYPASSRLS`, does not own tables, and cannot update or delete audit rows.
4. Money is `bigint` santim in columns ending `_minor`. Quantity is `numeric(12,3)`. Time is `timestamptz` in UTC.
5. Constraints carry the rules: primary key on `consumed_payments`, unique idempotency keys, checks on amounts, immutability trigger on completed sales.
6. One transaction per sale (sale, items, claim). Batch inserts for sync and imports with multi-row `INSERT` or `unnest`. No writes inside loops. Idempotent upserts. No write on a read path.
7. Index only what a real query needs, and add the index with the query.
8. Never run migrations against anything except the local development database without the student's instruction.
