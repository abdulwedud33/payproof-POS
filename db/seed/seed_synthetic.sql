-- Seed synthetic test baseline (No real customer data)
-- 1 Organization, 2 Branches (Bole, Piassa), 1 Owner, 2 Cashiers

DO $$
DECLARE
  v_org_id uuid;
  v_owner_id uuid;
  v_branch_bole_id uuid;
  v_branch_piassa_id uuid;
  v_cashier_dawit_id uuid;
  v_cashier_helen_id uuid;
  v_hashed_pw text := '$argon2id$v=19$m=65536,t=3,p=4$q1W2e3R4t5Y6u7I8o9P0$12345678901234567890123456789012'; -- dummy Argon2id hash for dev/test
  v_hashed_pin text := '$argon2id$v=19$m=65536,t=3,p=4$q1W2e3R4t5Y6u7I8o9P0$pinpinpinpinpinpinpinpinpinpin12'; -- dummy pin hash
BEGIN
  -- 1. Create Organization
  INSERT INTO organizations (name, void_pin_limit_minor, receipt_retention_days)
  VALUES ('Fresh Mart Supermarket', 50000, 30)
  RETURNING id INTO v_org_id;

  -- 2. Create Owner
  INSERT INTO users (org_id, role, full_name, phone, email, password_hash, pin_hash, status)
  VALUES (v_org_id, 'owner', 'Meseret Tadesse', '+251911223344', 'meseret@freshmart.test', v_hashed_pw, v_hashed_pin, 'active')
  RETURNING id INTO v_owner_id;

  -- 3. Create Branches
  INSERT INTO branches (org_id, name, city, address, timezone, status)
  VALUES (v_org_id, 'Bole Branch', 'Addis Ababa', 'Cameroon St, Bole', 'Africa/Addis_Ababa', 'active')
  RETURNING id INTO v_branch_bole_id;

  INSERT INTO branches (org_id, name, city, address, timezone, status)
  VALUES (v_org_id, 'Piassa Branch', 'Addis Ababa', 'Churchill Ave, Piassa', 'Africa/Addis_Ababa', 'active')
  RETURNING id INTO v_branch_piassa_id;

  -- 4. Create Cashiers
  INSERT INTO users (org_id, role, full_name, phone, password_hash, pin_hash, status)
  VALUES (v_org_id, 'cashier', 'Dawit Abebe', '+251922334455', v_hashed_pw, v_hashed_pin, 'active')
  RETURNING id INTO v_cashier_dawit_id;

  INSERT INTO users (org_id, role, full_name, phone, password_hash, pin_hash, status)
  VALUES (v_org_id, 'cashier', 'Helen Berhe', '+251933445566', v_hashed_pw, v_hashed_pin, 'active')
  RETURNING id INTO v_cashier_helen_id;

  -- 5. Assign Cashiers to Branches
  INSERT INTO user_branches (user_id, branch_id)
  VALUES
    (v_cashier_dawit_id, v_branch_bole_id),
    (v_cashier_helen_id, v_branch_piassa_id);

  -- 6. Log Initial Seed Audit
  INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
  VALUES (v_org_id, v_owner_id, 'owner', 'system.seed', 'organization', v_org_id::text, '{"seeded": true}'::jsonb);

END $$;
