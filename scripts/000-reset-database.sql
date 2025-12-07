-- 000-reset-database.sql
-- WARNING: This script WIPES ALL DATA from the application schema.
-- Use this only for development/testing when you need a clean slate to test the new migration scripts.

BEGIN;

-- 1. Drop ACA Reporting Tables (Depend on Census/Plan)
DROP TABLE IF EXISTS aca_penalty_report CASCADE;
DROP TABLE IF EXISTS aca_final_report CASCADE;
DROP TABLE IF EXISTS aca_employee_monthly_status CASCADE;
DROP TABLE IF EXISTS aca_employee_monthly_offer CASCADE;
DROP TABLE IF EXISTS aca_employee_monthly_enrollment CASCADE;

-- 1b. Drop Legacy / Obsolete Tables
DROP TABLE IF EXISTS company_modules CASCADE;
DROP TABLE IF EXISTS company_module CASCADE;


-- 2. Drop Business Data Tables (Depend on Core Schema)
DROP TABLE IF EXISTS payroll_hours CASCADE;
DROP TABLE IF EXISTS plan_enrollment_cost CASCADE;
DROP TABLE IF EXISTS employee_dependent CASCADE;
DROP TABLE IF EXISTS employee_plan_enrollment CASCADE;
DROP TABLE IF EXISTS employee_plan_eligibility CASCADE;
DROP TABLE IF EXISTS employee_waiting_period CASCADE;
DROP TABLE IF EXISTS employee_address CASCADE;
DROP TABLE IF EXISTS employee_census CASCADE;
DROP TABLE IF EXISTS plan_master CASCADE;

-- 3. Core Tables (PRESERVED to keep System Admin access)
-- DROP TABLE IF EXISTS user_company_mapping CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS company_details CASCADE;

-- If you REALLY want to wipe users, uncomment above, but you will lose System Admin access 
-- and must re-seed from 005 immediately.


-- 4. Drop Functions (Optional - standard CREATE OR REPLACE handles them, but good to clean stale ones)
DROP FUNCTION IF EXISTS generate_aca_monthly_interim(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS generate_aca_final_report(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS generate_aca_penalties(VARCHAR, INTEGER);
-- DROP FUNCTION IF EXISTS handle_new_user() CASCADE; -- Preserved for Profiles
-- DROP FUNCTION IF EXISTS is_system_admin();         -- Preserved for RLS policies
-- DROP FUNCTION IF EXISTS has_company_access(VARCHAR); -- Preserved for RLS policies

COMMIT;

-- After running this, run scripts 001 -> 005 in order to rebuild.
