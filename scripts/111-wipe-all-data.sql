
-- ====================================================================
-- Script: 111-wipe-all-data.sql
-- Purpose: Safely remove ALL imported data to allow for a clean re-import.
--          This is necessary because we changed the ID format (removed 'E')
--          and need to clear the old formatted IDs to prevent duplicates.
-- Status: ACTIVE
-- ====================================================================

BEGIN;

-- 1. Truncate ACA Report Tables
TRUNCATE TABLE aca_final_report CASCADE;
TRUNCATE TABLE aca_employee_monthly_status CASCADE;
TRUNCATE TABLE aca_employee_monthly_offer CASCADE;
TRUNCATE TABLE aca_employee_monthly_enrollment CASCADE;

-- 2. Truncate Employee Data Tables (Order matters due to FKs)
TRUNCATE TABLE employee_dependent CASCADE;
TRUNCATE TABLE employee_plan_enrollment CASCADE;
TRUNCATE TABLE employee_plan_eligibility CASCADE;
TRUNCATE TABLE employee_waiting_period CASCADE;
TRUNCATE TABLE employee_address CASCADE;
TRUNCATE TABLE plan_enrollment_cost CASCADE;
TRUNCATE TABLE payroll_hours CASCADE;

-- 3. Truncate Core Tables
TRUNCATE TABLE employee_census CASCADE;
-- We usually keep Company Details and Plan Master, but if you want a FULL validation, 
-- you can uncomment the lines below. For now, we keep companies/plans as their IDs 
-- (codes) usually don't have the 'E' prefix issue.
-- TRUNCATE TABLE plan_master CASCADE;
-- TRUNCATE TABLE company_details CASCADE;

COMMIT;

SELECT 'All employee and report data has been wiped. Please Re-Import from CSV files.' as result;
