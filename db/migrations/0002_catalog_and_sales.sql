-- 0002_catalog_and_sales.sql
-- Catalog (products, product_barcodes) and Sales (sales, sale_items)
-- Row-level security, immutability trigger, and reporting views

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_kind') THEN
    CREATE TYPE unit_kind AS ENUM ('piece', 'kg', 'litre', 'pack');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
    CREATE TYPE sale_status AS ENUM ('draft', 'awaiting_payment', 'payment_pending', 'paid', 'voided', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money');
  END IF;
END $$;

-- 2. Products and Barcodes
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id),
  name         text NOT NULL,
  name_local   text,
  sku          text,
  unit         unit_kind NOT NULL DEFAULT 'piece',
  price_minor  bigint NOT NULL CHECK (price_minor >= 0),
  active       boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_org_name_idx ON products (org_id, lower(name));
CREATE INDEX IF NOT EXISTS products_org_updated_idx ON products (org_id, updated_at);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode     text NOT NULL,
  UNIQUE (org_id, barcode)
);
CREATE INDEX IF NOT EXISTS product_barcodes_product_idx ON product_barcodes (product_id);

-- 3. Sales and Items
CREATE TABLE IF NOT EXISTS sales (
  id                  uuid PRIMARY KEY, -- client-generated UUID v7
  org_id              uuid NOT NULL REFERENCES organizations(id),
  branch_id           uuid NOT NULL REFERENCES branches(id),
  cashier_id          uuid NOT NULL REFERENCES users(id),
  device_id           uuid,
  status              sale_status NOT NULL DEFAULT 'draft',
  payment_method      payment_method,
  subtotal_minor      bigint NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  total_minor         bigint NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  cash_received_minor bigint,
  overpaid_minor      bigint NOT NULL DEFAULT 0,
  idempotency_key     text NOT NULL,
  client_created_at   timestamptz NOT NULL,
  completed_at        timestamptz,
  voided_at           timestamptz,
  void_reason         text,
  voided_by           uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
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

-- 4. Immutability Triggers
CREATE OR REPLACE FUNCTION fn_protect_sale_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('paid', 'voided') THEN
      RAISE EXCEPTION 'Completed or voided sales cannot be deleted (sale_id: %)', OLD.id
        USING ERRCODE = '23505';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' THEN
      -- Only allow updating void fields when transitioning to voided
      IF NEW.status = 'voided'
         AND NEW.voided_at IS NOT NULL
         AND NEW.void_reason IS NOT NULL
         AND NEW.voided_by IS NOT NULL
         AND NEW.id = OLD.id
         AND NEW.org_id = OLD.org_id
         AND NEW.branch_id = OLD.branch_id
         AND NEW.cashier_id = OLD.cashier_id
         AND NEW.total_minor = OLD.total_minor
         AND NEW.subtotal_minor = OLD.subtotal_minor
         AND NEW.cash_received_minor IS NOT DISTINCT FROM OLD.cash_received_minor
         AND NEW.payment_method = OLD.payment_method
         AND NEW.idempotency_key = OLD.idempotency_key THEN
        RETURN NEW;
      ELSE
        RAISE EXCEPTION 'Paid sales are immutable and cannot be updated except for voiding (sale_id: %)', OLD.id
          USING ERRCODE = '23505';
      END IF;
    ELSIF OLD.status = 'voided' THEN
      RAISE EXCEPTION 'Voided sales are immutable (sale_id: %)', OLD.id
        USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_sales ON sales;
CREATE TRIGGER trg_immutable_sales
BEFORE UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION fn_protect_sale_immutability();

CREATE OR REPLACE FUNCTION fn_protect_sale_items_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_sale_status sale_status;
BEGIN
  SELECT status INTO v_sale_status FROM sales WHERE id = OLD.sale_id;
  IF v_sale_status IN ('paid', 'voided') THEN
    RAISE EXCEPTION 'Items of completed or voided sales are immutable (sale_id: %)', OLD.sale_id
      USING ERRCODE = '23505';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_sale_items ON sale_items;
CREATE TRIGGER trg_immutable_sale_items
BEFORE UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_protect_sale_items_immutability();

-- 5. Reporting Views
CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  org_id,
  branch_id,
  date_trunc('day', completed_at AT TIME ZONE 'Africa/Addis_Ababa')::date AS sale_date,
  payment_method,
  count(*) AS total_sales,
  sum(total_minor) AS total_minor,
  sum(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) AS void_count,
  sum(CASE WHEN status = 'voided' THEN total_minor ELSE 0 END) AS void_minor
FROM sales
WHERE status IN ('paid', 'voided')
GROUP BY org_id, branch_id, 3, payment_method;

CREATE OR REPLACE VIEW v_product_sales_daily AS
SELECT
  s.org_id,
  s.branch_id,
  date_trunc('day', s.completed_at AT TIME ZONE 'Africa/Addis_Ababa')::date AS sale_date,
  si.product_id,
  si.name_snapshot,
  si.unit,
  sum(si.quantity) AS total_quantity,
  sum(si.line_total_minor) AS total_minor
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.status = 'paid'
GROUP BY s.org_id, s.branch_id, 3, si.product_id, si.name_snapshot, si.unit;

-- 6. Enable and Force RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes FORCE ROW LEVEL SECURITY;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items FORCE ROW LEVEL SECURITY;

-- 7. Restrictive Org Isolation Policies
CREATE POLICY org_isolation ON products AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON product_barcodes AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON sales AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

-- 8. Table Specific Role Policies
-- Products & Barcodes: Read by all staff, write by owner only
CREATE POLICY products_read ON products FOR SELECT
  USING (app_role() IN ('owner', 'manager', 'cashier'));

CREATE POLICY products_write ON products FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

CREATE POLICY barcodes_read ON product_barcodes FOR SELECT
  USING (app_role() IN ('owner', 'manager', 'cashier'));

CREATE POLICY barcodes_write ON product_barcodes FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

-- Sales
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

-- Sale Items: Tied to parent sale access
CREATE POLICY si_access ON sale_items FOR ALL
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id));

-- 9. Grants for app_api
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT SELECT, INSERT, UPDATE ON products, product_barcodes, sales, sale_items TO app_api;
    GRANT SELECT ON v_sales_daily, v_product_sales_daily TO app_api;
    REVOKE DELETE ON sales, sale_items FROM app_api;
  END IF;
END $$;
