-- 0001_core_and_rls.sql
-- Core organizations, users, branches, user_branches, audit_logs, refresh_tokens
-- Immediate Row-Level Security (RLS) enforcement and restrictive org isolation

-- 1. Session Context Functions
CREATE OR REPLACE FUNCTION app_org() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('app.role', true), '') $$;

CREATE OR REPLACE FUNCTION app_branches() RETURNS uuid[] LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(NULLIF(current_setting('app.branch_ids', true), '')::uuid[], '{}'::uuid[]) $$;

-- 2. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_status') THEN
    CREATE TYPE branch_status AS ENUM ('active', 'closed');
  END IF;
END $$;

-- 3. Core Tables
CREATE TABLE IF NOT EXISTS organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  void_pin_limit_minor bigint NOT NULL DEFAULT 0,
  receipt_retention_days integer NOT NULL DEFAULT 30,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id),
  role          user_role NOT NULL,
  full_name     text NOT NULL,
  phone         text NOT NULL,
  email         text,
  password_hash text NOT NULL,
  pin_hash      text,
  status        user_status NOT NULL DEFAULT 'active',
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (phone)
);
CREATE INDEX IF NOT EXISTS users_org_role_idx ON users (org_id, role) WHERE status <> 'deleted';

CREATE TABLE IF NOT EXISTS branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  name        text NOT NULL,
  city        text,
  address     text,
  timezone    text NOT NULL DEFAULT 'Africa/Addis_Ababa',
  status      branch_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS branches_org_idx ON branches (org_id);

CREATE TABLE IF NOT EXISTS user_branches (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id  uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);
CREATE INDEX IF NOT EXISTS user_branches_user_idx ON user_branches (user_id);
CREATE INDEX IF NOT EXISTS user_branches_branch_idx ON user_branches (branch_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           bigserial PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id),
  actor_id     uuid REFERENCES users(id),
  actor_role   user_role,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text,
  meta         jsonb NOT NULL DEFAULT '{}',
  ip           inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx ON audit_logs (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  device_info text,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);

-- 4. Enable and Force RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches FORCE ROW LEVEL SECURITY;

ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

-- 5. Restrictive Org Isolation Policies
CREATE POLICY org_isolation ON users AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON branches AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON audit_logs AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

-- 6. Role Policies
-- organizations
CREATE POLICY org_read ON organizations FOR SELECT
  USING (id = app_org());

CREATE POLICY org_update ON organizations FOR UPDATE
  USING (id = app_org() AND app_role() = 'owner')
  WITH CHECK (id = app_org());

-- users
CREATE POLICY users_owner_all ON users FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

CREATE POLICY users_self_read ON users FOR SELECT
  USING (id = app_user());

-- branches
CREATE POLICY branches_owner_all ON branches FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

CREATE POLICY branches_staff_read ON branches FOR SELECT
  USING (id = ANY (app_branches()));

-- user_branches
CREATE POLICY ub_owner_all ON user_branches FOR ALL
  USING (app_role() = 'owner' AND EXISTS (SELECT 1 FROM branches b WHERE b.id = branch_id))
  WITH CHECK (app_role() = 'owner' AND EXISTS (SELECT 1 FROM branches b WHERE b.id = branch_id));

CREATE POLICY ub_self_read ON user_branches FOR SELECT
  USING (user_id = app_user());

-- audit_logs (append-only)
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (app_role() = 'owner');

-- refresh_tokens
CREATE POLICY rt_self ON refresh_tokens FOR ALL
  USING (user_id = app_user())
  WITH CHECK (user_id = app_user());

-- 7. Grant Permissions to app_api
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT USAGE ON SCHEMA public TO app_api;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_api;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_api;
    REVOKE UPDATE, DELETE ON audit_logs FROM app_api;
  END IF;
END $$;
