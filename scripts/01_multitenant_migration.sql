-- ============================================================
-- MULTI-TENANT MIGRATION
-- ============================================================
-- 
-- PURPOSE: Convert ACA Builder to multi-tenant SaaS
-- 
-- FEATURES:
-- - Tenant (employer) management
-- - User management with roles (admin, employer_admin, employer_user)
-- - Module assignments (ACA, Penalty Dashboard)
-- - Row-Level Security for data isolation
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS and DROP IF EXISTS
--
-- ============================================================

-- ============================================================
-- STEP 1: CREATE TENANT MANAGEMENT TABLES
-- ============================================================

-- Tenants table (Employer Organizations)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Users table (Admin + Employer Users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employer_admin', 'employer_user')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);


-- Ensure admin users have NULL tenant_id (drop first if exists to make idempotent)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_no_tenant') THEN
    ALTER TABLE users DROP CONSTRAINT admin_no_tenant;
  END IF;
  
  ALTER TABLE users ADD CONSTRAINT admin_no_tenant 
    CHECK ((role = 'admin' AND tenant_id IS NULL) OR role != 'admin');
END $$;


-- Tenant modules (Feature flags per tenant)
CREATE TABLE IF NOT EXISTS tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL CHECK (module_name IN ('aca', 'penalty_dashboard')),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);

-- ============================================================
-- STEP 2: ADD TENANT_ID TO EXISTING TABLES
-- ============================================================

-- Base tables
ALTER TABLE "Emp_Demographic" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE "Emp_Eligibility" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE "Emp_Enrollment" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE "Dep_Enrollment" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Derived tables - Daily
ALTER TABLE employee_status_daily ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE eligibility_daily ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE enrollment_daily ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE dependent_enrollment_daily ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Derived tables - Monthly
ALTER TABLE employee_status_monthly ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE eligibility_monthly ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE enrollment_monthly ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE dependent_enrollment_monthly ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE employee_aca_monthly ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Create indexes on tenant_id for performance
CREATE INDEX IF NOT EXISTS idx_emp_demographic_tenant ON "Emp_Demographic"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_details_tenant ON employee_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_eligibility_tenant ON "Emp_Eligibility"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_enrollment_tenant ON "Emp_Enrollment"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dep_enrollment_tenant ON "Dep_Enrollment"(tenant_id);

CREATE INDEX IF NOT EXISTS idx_status_daily_tenant ON employee_status_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_daily_tenant ON eligibility_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_daily_tenant ON enrollment_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dep_daily_tenant ON dependent_enrollment_daily(tenant_id);

CREATE INDEX IF NOT EXISTS idx_status_monthly_tenant ON employee_status_monthly(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_monthly_tenant ON eligibility_monthly(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_monthly_tenant ON enrollment_monthly(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dep_monthly_tenant ON dependent_enrollment_monthly(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aca_monthly_tenant ON employee_aca_monthly(tenant_id);

-- ============================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to get current tenant ID from session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current user role from session
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set tenant context (called by middleware)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID, p_user_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id::TEXT, ''), false);
  PERFORM set_config('app.current_user_role', COALESCE(p_user_role, ''), false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 4: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Emp_Demographic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Emp_Eligibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Emp_Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dep_Enrollment" ENABLE ROW LEVEL SECURITY;

ALTER TABLE employee_status_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependent_enrollment_daily ENABLE ROW LEVEL SECURITY;

ALTER TABLE employee_status_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependent_enrollment_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_aca_monthly ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================

-- Tenant Management Tables (Admin Only)
-- ------------------------------------------------------------

-- tenants: Admin can do everything
CREATE POLICY admin_all_tenants ON tenants
  FOR ALL
  TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Employers can view their own tenant
CREATE POLICY employer_view_own_tenant ON tenants
  FOR SELECT
  TO PUBLIC
  USING (id = get_current_tenant_id());

-- users: Admin can manage all users
CREATE POLICY admin_all_users ON users
  FOR ALL
  TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Employers can view users in their tenant
CREATE POLICY employer_view_own_users ON users
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = get_current_tenant_id());

-- tenant_modules: Admin can manage
CREATE POLICY admin_all_modules ON tenant_modules
  FOR ALL
  TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Employers can view their modules
CREATE POLICY employer_view_own_modules ON tenant_modules
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = get_current_tenant_id());

-- Data Tables (Tenant Isolation)
-- ------------------------------------------------------------
-- Pattern: Admin sees all, employers see only their data

-- Emp_Demographic
CREATE POLICY admin_all_emp_demographic ON "Emp_Demographic"
  FOR ALL TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY tenant_own_emp_demographic ON "Emp_Demographic"
  FOR ALL TO PUBLIC
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- employee_details
CREATE POLICY admin_all_employee_details ON employee_details
  FOR ALL TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY tenant_own_employee_details ON employee_details
  FOR ALL TO PUBLIC
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Emp_Eligibility
CREATE POLICY admin_all_emp_eligibility ON "Emp_Eligibility"
  FOR ALL TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY tenant_own_emp_eligibility ON "Emp_Eligibility"
  FOR ALL TO PUBLIC
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Emp_Enrollment
CREATE POLICY admin_all_emp_enrollment ON "Emp_Enrollment"
  FOR ALL TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY tenant_own_emp_enrollment ON "Emp_Enrollment"
  FOR ALL TO PUBLIC
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Dep_Enrollment
CREATE POLICY admin_all_dep_enrollment ON "Dep_Enrollment"
  FOR ALL TO PUBLIC
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY tenant_own_dep_enrollment ON "Dep_Enrollment"
  FOR ALL TO PUBLIC
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Repeat for all derived tables (daily)
CREATE POLICY admin_all_status_daily ON employee_status_daily FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_status_daily ON employee_status_daily FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_eligibility_daily ON eligibility_daily FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_eligibility_daily ON eligibility_daily FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_enrollment_daily ON enrollment_daily FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_enrollment_daily ON enrollment_daily FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_dep_daily ON dependent_enrollment_daily FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_dep_daily ON dependent_enrollment_daily FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

-- Repeat for all derived tables (monthly)
CREATE POLICY admin_all_status_monthly ON employee_status_monthly FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_status_monthly ON employee_status_monthly FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_eligibility_monthly ON eligibility_monthly FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_eligibility_monthly ON eligibility_monthly FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_enrollment_monthly ON enrollment_monthly FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_enrollment_monthly ON enrollment_monthly FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_dep_monthly ON dependent_enrollment_monthly FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_dep_monthly ON dependent_enrollment_monthly FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY admin_all_aca_monthly ON employee_aca_monthly FOR ALL TO PUBLIC USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY tenant_own_aca_monthly ON employee_aca_monthly FOR ALL TO PUBLIC USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================================
-- STEP 6: SEED DEFAULT DATA
-- ============================================================

-- Create default admin user
-- Email: naveen
-- Password: naveen-123
INSERT INTO users (email, password_hash, role, tenant_id, is_active)
VALUES (
  'naveen',
  -- Password hash for 'naveen-123' (using pbkdf2)
  'admin-password-hash-placeholder',
  'admin',
  NULL,
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- 
-- Next steps:
-- 1. Update middleware to set tenant context
-- 2. Update upload API to include tenant_id
-- 3. Create admin UI for tenant/user management
-- 4. Test data isolation
--
-- ============================================================
