
-- ====================================================================
-- Script: 109-force-cleanup-interim.sql
-- Purpose: Manually delete all interim ACA data to ensure a clean slate.
--          Useful if the generation function fails to clear old data.
-- Status: ACTIVE
-- ====================================================================

BEGIN;

-- 1. Cleanup Company 303
DELETE FROM aca_employee_monthly_offer WHERE company_code = '303';
DELETE FROM aca_employee_monthly_enrollment WHERE company_code = '303';
DELETE FROM aca_employee_monthly_status WHERE company_code = '303';

-- 2. Cleanup Company 404
DELETE FROM aca_employee_monthly_offer WHERE company_code = '404';
DELETE FROM aca_employee_monthly_enrollment WHERE company_code = '404';
DELETE FROM aca_employee_monthly_status WHERE company_code = '404';

-- 3. Cleanup Company 202 (Just in case, to regenerate consistently)
DELETE FROM aca_employee_monthly_offer WHERE company_code = '202';
DELETE FROM aca_employee_monthly_enrollment WHERE company_code = '202';
DELETE FROM aca_employee_monthly_status WHERE company_code = '202';

COMMIT;

SELECT 'Cleanup Complete. All interim tables cleared for 202, 303, 404.' as result;
