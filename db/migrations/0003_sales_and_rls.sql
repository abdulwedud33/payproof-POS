-- 0003_sales_and_rls.sql
-- Sales, sale_items, immutability trigger
-- Immediate Row-Level Security (RLS) enforcement and restrictive org isolation

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
    CREATE TYPE sale_status AS ENUM ('draft', 'awaiting_payment', 'payment_pending', 'paid', 'voided', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money');
  END IF;
END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS sales (
  id               uuid PRIMARY KEY,                    -- client-generated UUID v7
  org_id           uuid NOT NULL REFERENCES organizations(id),
  branch_id        uuid NOT NULL REFERENCES branches(id),
  cashier_id       uuid NOT NULL REFERENCES users(id),
  device_id        uuid,
  status           sale_status NOT NULL DEFAULT 'draft',
  payment_method   payment_method,
  subtotal_minor   bigint NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  total_minor      bigint NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  cash_received_minor bigint,
  overpaid_minor   bigint NOT NULL DEFAULT 0,
  idempotency_key  text NOT NULL,
  client_created_at timestamptz NOT NULL,
  completed_at     timestamptz,
  voided_at        timestamptz,
  void_reason      text,
  voided_by        uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS sales_branch_time_idx  ON sales (branch_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS sales_cashier_time_idx ON sales (cashier_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS sales_org_time_idx     ON sales (org_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS sale_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id            uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id         uuid REFERENCES products(id),
  name_snapshot      text NOT NULL,
  barcode_snapshot   text,
  unit               unit_kind NOT NULL,
  unit_price_minor   bigint NOT NULL CHECK (unit_price_minor >= 0),
  quantity           numeric(12,3) NOT NULL CHECK (quantity > 0),
  line_total_minor   bigint NOT NULL CHECK (line_total_minor >= 0)
);
CREATE INDEX IF NOT EXISTS sale_items_sale_idx    ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_idx ON sale_items (product_id);

-- 3. Immutability Trigger: Completed sales cannot be altered; corrections happen through logged voids
CREATE OR REPLACE FUNCTION trg_prevent_completed_sale_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'paid' THEN
    -- Only void-related columns may change
    IF NEW.status = 'voided' AND
       OLD.id = NEW.id AND
       OLD.org_id = NEW.org_id AND
       OLD.branch_id = NEW.branch_id AND
       OLD.cashier_id = NEW.cashier_id AND
       OLD.total_minor = NEW.total_minor AND
       OLD.subtotal_minor = NEW.subtotal_minor AND
       OLD.idempotency_key = NEW.idempotency_key THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Completed sales are immutable. Only voids are permitted.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sale_immutability_check ON sales;
CREATE TRIGGER sale_immutability_check
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION trg_prevent_completed_sale_mutation();

CREATE OR REPLACE FUNCTION trg_prevent_sale_items_mutation()
RETURNS trigger AS $$
DECLARE
  v_status sale_status;
BEGIN
  SELECT status INTO v_status FROM sales WHERE id = COALESCE(OLD.sale_id, NEW.sale_id);
  IF v_status = 'paid' THEN
    RAISE EXCEPTION 'Sale items of completed sales cannot be updated or deleted.' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sale_items_immutability_check ON sale_items;
CREATE TRIGGER sale_items_immutability_check
BEFORE UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION trg_prevent_sale_items_mutation();

-- 4. Enable and Force RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items FORCE ROW LEVEL SECURITY;

-- 5. Restrictive Org Isolation Policies
CREATE POLICY org_isolation ON sales AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

-- 6. Role Policies
-- sales
CREATE POLICY sales_owner_all ON sales FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

CREATE POLICY sales_cashier_read ON sales FOR SELECT
  USING (branch_id = ANY (app_branches()) AND cashier_id = app_user());

CREATE POLICY sales_cashier_insert ON sales FOR INSERT
  WITH CHECK (app_role() = 'cashier' AND branch_id = ANY (app_branches()) AND cashier_id = app_user());

CREATE POLICY sales_cashier_update ON sales FOR UPDATE
  USING (app_role() = 'cashier' AND branch_id = ANY (app_branches()) AND cashier_id = app_user())
  WITH CHECK (branch_id = ANY (app_branches()) AND cashier_id = app_user());

-- sale_items: visible and writable through the parent sale
CREATE POLICY si_access ON sale_items FOR ALL
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id));

-- 7. Grants
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT SELECT, INSERT, UPDATE ON sales, sale_items TO app_api;
    REVOKE DELETE ON sales, sale_items FROM app_api;
  END IF;
END $$;
