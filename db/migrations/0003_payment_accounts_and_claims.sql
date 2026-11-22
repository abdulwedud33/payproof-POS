-- 0003_payment_accounts_and_claims.sql
-- Saved Payment Accounts, One-Use Guard (consumed_payments), Payment Verifications, Alerts, and Manual Overrides
-- Row-level security, immutability triggers, and integrity constraints

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider') THEN
    CREATE TYPE provider AS ENUM ('telebirr', 'cbe', 'mock');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verdict') THEN
    CREATE TYPE verdict AS ENUM ('verifying', 'verified', 'waiting', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reject_reason') THEN
    CREATE TYPE reject_reason AS ENUM (
      'untrusted_link',
      'fetch_failed',
      'not_successful',
      'wrong_receiver',
      'too_old',
      'short_payment',
      'already_used'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_kind') THEN
    CREATE TYPE alert_kind AS ENUM (
      'duplicate_claim',
      'wrong_receiver',
      'account_changed',
      'short_payment',
      'untrusted_link'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
  END IF;
END $$;

-- 2. Payment Accounts (Per-Branch Saved Receiving Accounts)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES organizations(id),
  branch_id              uuid NOT NULL REFERENCES branches(id),
  provider               provider NOT NULL,
  display_label          text NOT NULL,
  holder_name            text NOT NULL,
  holder_name_normalized text NOT NULL,
  account_ref_enc        bytea NOT NULL, -- Encrypted at rest using AES-256-GCM
  account_ref_last4      text NOT NULL CHECK (char_length(account_ref_last4) = 4),
  active                 boolean NOT NULL DEFAULT true,
  created_by             uuid REFERENCES users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, provider, account_ref_last4)
);
CREATE INDEX IF NOT EXISTS payment_accounts_branch_idx ON payment_accounts (branch_id, active);
CREATE INDEX IF NOT EXISTS payment_accounts_org_idx ON payment_accounts (org_id, active);

-- 3. Payment Verifications (Attempt & Evidence Audit Log)
CREATE TABLE IF NOT EXISTS payment_verifications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES organizations(id),
  sale_id              uuid NOT NULL REFERENCES sales(id),
  attempt_no           integer NOT NULL DEFAULT 1,
  source               text NOT NULL DEFAULT 'qr',
  provider             provider,
  qr_ref_sha256        char(64),
  qr_host              text,
  qr_path_pattern      text,
  provider_txn_id      text,
  provider_status      text,
  amount_minor         bigint CHECK (amount_minor IS NULL OR amount_minor >= 0),
  paid_at              timestamptz,
  receiver_name_masked text,
  receiver_ref_masked  text,
  payer_name_masked    text,
  fetch_http_status    smallint,
  fetched_at           timestamptz,
  parser_version       text,
  matched_account_id   uuid REFERENCES payment_accounts(id),
  receiver_match       boolean,
  amount_ok            boolean,
  time_ok              boolean,
  verdict              verdict NOT NULL DEFAULT 'verifying',
  reject_reason        reject_reason,
  reasons              text[] NOT NULL DEFAULT '{}',
  decided_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, attempt_no),
  CONSTRAINT chk_verified_integrity CHECK (
    verdict != 'verified' OR (receiver_match = true AND amount_ok = true AND time_ok = true)
  )
);
CREATE INDEX IF NOT EXISTS pv_sale_idx ON payment_verifications (sale_id);
CREATE INDEX IF NOT EXISTS pv_txn_idx ON payment_verifications (provider, provider_txn_id);

-- 4. Consumed Payments (The System-Wide Atomic One-Use Guard)
CREATE TABLE IF NOT EXISTS consumed_payments (
  provider        provider NOT NULL,
  provider_txn_id text NOT NULL,
  org_id          uuid NOT NULL REFERENCES organizations(id),
  sale_id         uuid NOT NULL REFERENCES sales(id),
  verification_id uuid REFERENCES payment_verifications(id),
  amount_minor    bigint NOT NULL CHECK (amount_minor >= 0),
  consumed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_txn_id)
);
CREATE INDEX IF NOT EXISTS cp_sale_idx ON consumed_payments (sale_id);
CREATE INDEX IF NOT EXISTS cp_org_idx ON consumed_payments (org_id, consumed_at DESC);

-- 5. Immutability Trigger on Consumed Payments (Claims cannot be deleted or mutated)
CREATE OR REPLACE FUNCTION fn_protect_consumed_payment_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Consumed payment claims are strictly immutable (provider: %, txn_id: %)',
      OLD.provider, OLD.provider_txn_id
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_consumed_payments ON consumed_payments;
CREATE TRIGGER trg_immutable_consumed_payments
BEFORE UPDATE OR DELETE ON consumed_payments
FOR EACH ROW EXECUTE FUNCTION fn_protect_consumed_payment_immutability();

-- 6. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  branch_id   uuid REFERENCES branches(id),
  kind        alert_kind NOT NULL,
  severity    alert_severity NOT NULL DEFAULT 'warning',
  title       text NOT NULL,
  message     text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved    boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_org_resolved_idx ON alerts (org_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_branch_idx ON alerts (branch_id, resolved, created_at DESC);

-- 7. Manual Overrides Table
CREATE TABLE IF NOT EXISTS manual_overrides (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id),
  sale_id      uuid NOT NULL REFERENCES sales(id),
  requested_by uuid NOT NULL REFERENCES users(id),
  approved_by  uuid NOT NULL REFERENCES users(id),
  reason       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manual_overrides_sale_idx ON manual_overrides (sale_id);

-- 8. Enable and Force Row-Level Security (RLS)
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications FORCE ROW LEVEL SECURITY;

ALTER TABLE consumed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumed_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE manual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_overrides FORCE ROW LEVEL SECURITY;

-- 9. Restrictive Org Isolation Policies
CREATE POLICY org_isolation ON payment_accounts AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON payment_verifications AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON consumed_payments AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON alerts AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON manual_overrides AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

-- 10. Role Policies

-- payment_accounts:
-- Read: owners see all in org; cashiers see active accounts of their assigned branch
CREATE POLICY pa_read ON payment_accounts FOR SELECT
  USING (
    app_role() IN ('owner', 'manager') OR
    (app_role() = 'cashier' AND branch_id = ANY (app_branches()) AND active = true)
  );

-- Write: owners only
CREATE POLICY pa_write ON payment_accounts FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

-- payment_verifications:
-- Read: owners/managers see all in org; cashiers see verifications for sales in their assigned branch
CREATE POLICY pv_read ON payment_verifications FOR SELECT
  USING (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  );

-- Insert/Update: cashiers (for their branch's sales) and owners
CREATE POLICY pv_write ON payment_verifications FOR ALL
  USING (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  )
  WITH CHECK (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  );

-- consumed_payments:
-- Read: all authenticated staff in org
CREATE POLICY cp_read ON consumed_payments FOR SELECT
  USING (app_role() IN ('owner', 'manager', 'cashier'));

-- Insert: staff for their branch sales
CREATE POLICY cp_insert ON consumed_payments FOR INSERT
  WITH CHECK (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  );

-- alerts:
-- Read: owners and managers
CREATE POLICY alerts_read ON alerts FOR SELECT
  USING (app_role() IN ('owner', 'manager'));

-- Insert: staff can create alerts (e.g. cashier reporting fraud or system trigger)
CREATE POLICY alerts_insert ON alerts FOR INSERT
  WITH CHECK (app_role() IN ('owner', 'manager', 'cashier'));

-- Update (resolve): owners and managers
CREATE POLICY alerts_update ON alerts FOR UPDATE
  USING (app_role() IN ('owner', 'manager'))
  WITH CHECK (app_role() IN ('owner', 'manager'));

-- manual_overrides:
-- Read: owners, managers, and cashiers for their branch
CREATE POLICY mo_read ON manual_overrides FOR SELECT
  USING (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  );

-- Insert: cashiers/owners
CREATE POLICY mo_insert ON manual_overrides FOR INSERT
  WITH CHECK (
    app_role() IN ('owner', 'manager') OR
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND s.branch_id = ANY (app_branches()))
  );

-- 11. Role Grants
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT SELECT, INSERT, UPDATE ON payment_accounts, payment_verifications, alerts, manual_overrides TO app_api;
    GRANT SELECT, INSERT ON consumed_payments TO app_api;
    REVOKE DELETE ON payment_accounts, payment_verifications, consumed_payments, alerts, manual_overrides FROM app_api;
  END IF;
END $$;
