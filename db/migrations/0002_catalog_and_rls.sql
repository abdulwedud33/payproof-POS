-- 0002_catalog_and_rls.sql
-- Products, product_barcodes, branch_prices
-- Immediate Row-Level Security (RLS) enforcement and restrictive org isolation

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_kind') THEN
    CREATE TYPE unit_kind AS ENUM ('piece', 'kg', 'litre', 'pack');
  END IF;
END $$;

-- 2. Tables
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
CREATE INDEX IF NOT EXISTS product_barcodes_org_idx ON product_barcodes (org_id, barcode);

CREATE TABLE IF NOT EXISTS branch_prices (
  branch_id    uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_minor  bigint NOT NULL CHECK (price_minor >= 0),
  PRIMARY KEY (branch_id, product_id)
);

-- 3. Enable and Force RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes FORCE ROW LEVEL SECURITY;

ALTER TABLE branch_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_prices FORCE ROW LEVEL SECURITY;

-- 4. Restrictive Org Isolation Policies
CREATE POLICY org_isolation ON products AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

CREATE POLICY org_isolation ON product_barcodes AS RESTRICTIVE
  USING (org_id = app_org()) WITH CHECK (org_id = app_org());

-- 5. Role Policies
-- products: read by staff in org, write by owner
CREATE POLICY products_read ON products FOR SELECT
  USING (app_role() IN ('owner', 'manager', 'cashier'));

CREATE POLICY products_write ON products FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

-- product_barcodes: read by staff in org, write by owner
CREATE POLICY barcodes_read ON product_barcodes FOR SELECT
  USING (app_role() IN ('owner', 'manager', 'cashier'));

CREATE POLICY barcodes_write ON product_barcodes FOR ALL
  USING (app_role() = 'owner')
  WITH CHECK (app_role() = 'owner');

-- branch_prices: through branch
CREATE POLICY bp_read ON branch_prices FOR SELECT
  USING (branch_id = ANY (app_branches()) OR app_role() = 'owner');

CREATE POLICY bp_write ON branch_prices FOR ALL
  USING (app_role() = 'owner' AND EXISTS (SELECT 1 FROM branches b WHERE b.id = branch_id))
  WITH CHECK (app_role() = 'owner' AND EXISTS (SELECT 1 FROM branches b WHERE b.id = branch_id));

-- 6. Grants
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON products, product_barcodes, branch_prices TO app_api;
  END IF;
END $$;
