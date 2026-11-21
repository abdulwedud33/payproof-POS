---
name: new-table-with-rls
description: Add a database table or migration with row level security enabled and forced, written policies, constraints, indexes, and an RLS test. Use for any schema change.
---

# New table with row level security

Input: table purpose, owning business or branch scope, and which roles read and write it.

## Steps

1. Read `docs/05-backend-schema.md` (conventions and section 6, row-level security) and `.agents/rules/database.md`.
2. Write a forward-only migration. Use `uuid` keys, `bigint` santim for money in `_minor` columns, `timestamptz`, and an `org_id` on every business table.
3. `ENABLE` and `FORCE ROW LEVEL SECURITY` in the same migration.
4. Add a restrictive business-isolation policy, then role policies: owner, manager, cashier (own branch, and own rows where relevant), and device if applicable. Missing context must return nothing.
5. Put the rules in constraints: uniqueness, checks, foreign keys, immutability triggers where records must not change.
6. Add only the indexes real queries need.
7. Grant the API role only the privileges it needs. No update or delete on audit data.
8. Write the RLS test: another business reads and writes nothing, another branch reads nothing, missing context returns nothing, and a cashier cannot write outside their scope.
9. Update `docs/05-backend-schema.md` (table, policy, entity diagram).
10. Run the migration on a fresh database and on a seeded one. Never run it on anything but the local development database.
