-- ========================================================================================
-- Script: 104-fix-import-functions.sql
-- Purpose: Critical fix for Import Data functionality.
-- Status: ACTIVE / CRITICAL
--
-- Fixes two specific bugs:
-- 1. "Ambiguous Function" Error (Company Details):
--    - Caused by multiple 'upsert_company_details' signatures.
--    - Fix: Drops old signatures and recreates one definitive function with DATE type for 'p_add_date'.
--
-- 2. "Duplicate Key" Error (Payroll Hours):
--    - Caused by 'ON CONFLICT' target including 'pay_period_end', which allowed duplicate 
--      Start Date entries that violated the database unique constraint.
--    - Fix: Updates 'upsert_payroll_hours' to conflict strictly on (company_code, employee_id, pay_period_start).
-- ========================================================================================

-- Consolidated Fix for Import Functions

-- ==========================================
-- 1. FIX UPSERT_COMPANY_DETAILS
-- ==========================================

-- Drop all existing versions of the function to remove ambiguity
DROP FUNCTION IF EXISTS public.upsert_company_details(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, boolean, boolean, boolean, boolean, character varying, date, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.upsert_company_details(text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, uuid, timestamp with time zone, boolean);

-- Recreate the correct, most recent version (including is_active)
CREATE OR REPLACE FUNCTION public.upsert_company_details(
    p_company_code TEXT,
    p_company_name TEXT,
    p_dba_name TEXT DEFAULT NULL,
    p_ein TEXT DEFAULT NULL,
    p_address_line_1 TEXT DEFAULT NULL,
    p_address_line_2 TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
    p_is_agg_ale_group BOOLEAN DEFAULT FALSE,
    p_cert_qualifying_offer BOOLEAN DEFAULT FALSE,
    p_cert_98_percent_offer BOOLEAN DEFAULT FALSE,
    p_add_name TEXT DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE 
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    INSERT INTO public.company_details (
        company_code, company_name, dba_name, ein,
        address_line_1, address_line_2, city, state, zip_code, country,
        contact_name, contact_phone, contact_email,
        is_authoritative_transmittal, is_agg_ale_group, cert_qualifying_offer, cert_98_percent_offer,
        add_name, add_date, modified_by, modified_on, is_active,
        updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein,
        p_address_line_1, p_address_line_2, p_city, p_state, p_zip_code, p_country,
        p_contact_name, p_contact_phone, p_contact_email,
        p_is_authoritative_transmittal, p_is_agg_ale_group, p_cert_qualifying_offer, p_cert_98_percent_offer,
        p_add_name, p_add_date, p_modified_by, p_modified_on, p_is_active,
        NOW()
    )
    ON CONFLICT (company_code) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        dba_name = EXCLUDED.dba_name,
        ein = EXCLUDED.ein,
        address_line_1 = EXCLUDED.address_line_1,
        address_line_2 = EXCLUDED.address_line_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        country = EXCLUDED.country,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        contact_email = EXCLUDED.contact_email,
        is_authoritative_transmittal = EXCLUDED.is_authoritative_transmittal,
        is_agg_ale_group = EXCLUDED.is_agg_ale_group,
        cert_qualifying_offer = EXCLUDED.cert_qualifying_offer,
        cert_98_percent_offer = EXCLUDED.cert_98_percent_offer,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        modified_by = EXCLUDED.modified_by,
        modified_on = EXCLUDED.modified_on,
        is_active = CASE 
            WHEN p_is_active IS NOT NULL THEN p_is_active 
            ELSE company_details.is_active 
        END,
        updated_at = NOW()
    RETURNING to_jsonb(company_details.*) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ==========================================
-- 2. FIX UPSERT_PAYROLL_HOURS
-- ==========================================

CREATE OR REPLACE FUNCTION upsert_payroll_hours(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_pay_period_start DATE,
    p_pay_period_end DATE,
    p_hours_worked NUMERIC DEFAULT NULL,
    p_regular_hours NUMERIC DEFAULT NULL,
    p_overtime_hours NUMERIC DEFAULT NULL,
    p_gross_wages NUMERIC DEFAULT NULL,
    p_month INTEGER DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO payroll_hours (
        company_code, employee_id, pay_period_start, pay_period_end,
        hours_worked, regular_hours, overtime_hours, gross_wages, month,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_pay_period_start, p_pay_period_end,
        p_hours_worked, p_regular_hours, p_overtime_hours, p_gross_wages, p_month,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    -- Conflict on strict 3-column identifier (Start Date determines the record)
    -- This fixes the issue where 'pay_period_end' mismatch caused INSERTs instead of UPDATEs
    ON CONFLICT (company_code, employee_id, pay_period_start) DO UPDATE SET
        pay_period_end = EXCLUDED.pay_period_end, -- Allow updating End Date
        hours_worked = EXCLUDED.hours_worked,
        regular_hours = EXCLUDED.regular_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        gross_wages = EXCLUDED.gross_wages,
        month = EXCLUDED.month,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        modified_by = EXCLUDED.modified_by,
        modified_on = EXCLUDED.modified_on,
        updated_at = NOW();

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
