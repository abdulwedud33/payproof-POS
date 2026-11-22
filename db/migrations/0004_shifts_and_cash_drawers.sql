-- ============================================================================
-- Migration 0004: Shifts & Cash Drawer Reconciliation (Z-Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES cashiers(id) ON DELETE CASCADE,
    opening_float_minor BIGINT NOT NULL CHECK (opening_float_minor >= 0),
    expected_cash_minor BIGINT DEFAULT 0,
    actual_cash_minor BIGINT,
    cash_difference_minor BIGINT,
    total_mobile_money_minor BIGINT DEFAULT 0,
    total_sales_count INT DEFAULT 0,
    total_void_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_org_branch ON shifts (org_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON shifts (cashier_id, status);

-- Enable and Force Row-Level Security
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts FORCE ROW LEVEL SECURITY;

-- Policy: Owners can view and manage all shifts in their organization
CREATE POLICY shifts_owner_all ON shifts
    FOR ALL
    USING (
        org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        AND NULLIF(current_setting('app.current_role', true), '') = 'owner'
    )
    WITH CHECK (
        org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        AND NULLIF(current_setting('app.current_role', true), '') = 'owner'
    );

-- Policy: Cashiers can view and manage their own shift in their assigned branch
CREATE POLICY shifts_cashier_own ON shifts
    FOR ALL
    USING (
        org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        AND branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
        AND cashier_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        AND branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
        AND cashier_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );

-- Grant privileges to the application database user
GRANT SELECT, INSERT, UPDATE ON shifts TO payproof_app;
