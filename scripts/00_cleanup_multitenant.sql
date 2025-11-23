-- ============================================================
-- CLEANUP SCRIPT: Remove all multi-tenant objects
-- ============================================================
-- Run this BEFORE running 01_multitenant_migration.sql
-- This allows you to start fresh
-- ============================================================

-- Drop all RLS policies
DROP POLICY IF EXISTS admin_all_tenants ON tenants;
DROP POLICY IF EXISTS employer_view_own_tenant ON tenants;
DROP POLICY IF EXISTS admin_all_users ON users;
DROP POLICY IF EXISTS employer_view_own_users ON users;
DROP POLICY IF EXISTS admin_all_modules ON tenant_modules;
DROP POLICY IF EXISTS employer_view_own_modules ON tenant_modules;

DROP POLICY IF EXISTS admin_all_emp_demographic ON "Emp_Demographic";
DROP POLICY IF EXISTS tenant_own_emp_demographic ON "Emp_Demographic";
DROP POLICY IF EXISTS admin_all_employee_details ON employee_details;
DROP POLICY IF EXISTS tenant_own_employee_details ON employee_details;
DROP POLICY IF EXISTS admin_all_emp_eligibility ON "Emp_Eligibility";
DROP POLICY IF EXISTS tenant_own_emp_eligibility ON "Emp_Eligibility";
DROP POLICY IF EXISTS admin_all_emp_enrollment ON "Emp_Enrollment";
DROP POLICY IF EXISTS tenant_own_emp_enrollment ON "Emp_Enrollment";
DROP POLICY IF EXISTS admin_all_dep_enrollment ON "Dep_Enrollment";
DROP POLICY IF EXISTS tenant_own_dep_enrollment ON "Dep_Enrollment";

DROP POLICY IF EXISTS admin_all_status_daily ON employee_status_daily;
DROP POLICY IF EXISTS tenant_own_status_daily ON employee_status_daily;
DROP POLICY IF EXISTS admin_all_eligibility_daily ON eligibility_daily;
DROP POLICY IF EXISTS tenant_own_eligibility_daily ON eligibility_daily;
DROP POLICY IF EXISTS admin_all_enrollment_daily ON enrollment_daily;
DROP POLICY IF EXISTS tenant_own_enrollment_daily ON enrollment_daily;
DROP POLICY IF EXISTS admin_all_dep_daily ON dependent_enrollment_daily;
DROP POLICY IF EXISTS tenant_own_dep_daily ON dependent_enrollment_daily;

DROP POLICY IF EXISTS admin_all_status_monthly ON employee_status_monthly;
DROP POLICY IF EXISTS tenant_own_status_monthly ON employee_status_monthly;
DROP POLICY IF EXISTS admin_all_eligibility_monthly ON eligibility_monthly;
DROP POLICY IF EXISTS tenant_own_eligibility_monthly ON eligibility_monthly;
DROP POLICY IF EXISTS admin_all_enrollment_monthly ON enrollment_monthly;
DROP POLICY IF EXISTS tenant_own_enrollment_monthly ON enrollment_monthly;
DROP POLICY IF EXISTS admin_all_dep_monthly ON dependent_enrollment_monthly;
DROP POLICY IF EXISTS tenant_own_dep_monthly ON dependent_enrollment_monthly;
DROP POLICY IF EXISTS admin_all_aca_monthly ON employee_aca_monthly;
DROP POLICY IF EXISTS tenant_own_aca_monthly ON employee_aca_monthly;

-- Disable RLS
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Emp_Demographic" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Emp_Eligibility" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Emp_Enrollment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Dep_Enrollment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_status_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS eligibility_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollment_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dependent_enrollment_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_status_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS eligibility_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollment_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dependent_enrollment_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_aca_monthly DISABLE ROW LEVEL SECURITY;

-- Drop helper functions
DROP FUNCTION IF EXISTS set_tenant_context(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_tenant_id();
DROP FUNCTION IF EXISTS get_current_user_role();

-- Remove tenant_id columns (optional - only if you want a full reset)
-- ALTER TABLE "Emp_Demographic" DROP COLUMN IF EXISTS tenant_id;
-- ALTER TABLE employee_details DROP COLUMN IF EXISTS tenant_id;
-- ... etc

-- Drop tables (this will delete all data!)
DROP TABLE IF EXISTS tenant_modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================================
-- CLEANUP COMPLETE
-- ============================================================
-- Now run: scripts/01_multitenant_migration.sql
-- ============================================================
