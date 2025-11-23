-- ============================================================
-- TEMPORARY: Disable RLS for Testing
-- ============================================================
-- Use this if you're having issues accessing the app
-- This bypasses all RLS checks so admins can access everything
-- ============================================================

-- Disable RLS on all data tables
ALTER TABLE "Emp_Demographic" DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Emp_Eligibility" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Emp_Enrollment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Dep_Enrollment" DISABLE ROW LEVEL SECURITY;

ALTER TABLE employee_status_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE dependent_enrollment_daily DISABLE ROW LEVEL SECURITY;

ALTER TABLE employee_status_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE dependent_enrollment_monthly DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_aca_monthly DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on management tables (admin can still access)
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_modules DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUCCESS! You should now be able to access the app
-- ============================================================
-- 
-- To re-enable RLS later (for production):
-- ALTER TABLE "Emp_Demographic" ENABLE ROW LEVEL SECURITY;
-- ... etc
--
-- ============================================================
