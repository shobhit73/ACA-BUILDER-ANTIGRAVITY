-- 0. Cleanup Old Confounding Tables (If they exist)
-- This section drops tables that might have been created by earlier iterations or manual tests
-- but are NOT part of the official robust import schema.
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "census" CASCADE;
DROP TABLE IF EXISTS "dependents" CASCADE;
DROP TABLE IF EXISTS "benefits" CASCADE;
DROP TABLE IF EXISTS "plans" CASCADE;
DROP TABLE IF EXISTS "pay_periods" CASCADE;
DROP TABLE IF EXISTS "timesheets" CASCADE;

-- 1. Ensure Correct Tables Exist (Idempotent checks)
CREATE TABLE IF NOT EXISTS company_details (
    company_code VARCHAR PRIMARY KEY,
    company_name VARCHAR NOT NULL,
    dba_name VARCHAR,
    ein VARCHAR,
    address_line_1 VARCHAR,
    address_line_2 VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    country VARCHAR,
    contact_name VARCHAR,
    contact_phone VARCHAR,
    contact_email VARCHAR,
    is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
    is_agg_ale_group BOOLEAN DEFAULT FALSE,
    cert_qualifying_offer BOOLEAN DEFAULT FALSE,
    cert_98_percent_offer BOOLEAN DEFAULT FALSE,
    add_name VARCHAR,
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Adding other main tables if they don't exist is handled by previous scripts, 
-- but we enforce the cleanup primarily here)

-- 2. Validate RLS Policies (Re-applying critical ones to be safe)
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System Admin can do everything on company_details" ON company_details;
CREATE POLICY "System Admin can do everything on company_details"
    ON company_details
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

-- 3. Notify Completion
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed. Old confusing tables dropped.';
END $$;
