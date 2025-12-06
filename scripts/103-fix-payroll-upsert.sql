
-- Fix Upsert Payroll Hours to match the stricter 3-column unique constraint
-- The database has a constraint on (company_code, employee_id, pay_period_start).
-- The previous upsert included 'pay_period_end' in the conflict target, causing inserts instead of updates
-- when the 'end' date differed slightly, leading to unique constraint violations.

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
    ON CONFLICT (company_code, employee_id, pay_period_start) DO UPDATE SET
        pay_period_end = EXCLUDED.pay_period_end, -- Update End Date if it changed
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
