-- Add missing columns to tables

-- Plan Master
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS mvc BOOLEAN DEFAULT FALSE;
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS me BOOLEAN DEFAULT FALSE;
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS plan_affordable_cost NUMERIC(10, 2);

-- Drop deprecated columns
ALTER TABLE plan_master DROP COLUMN IF EXISTS coverage_type;
ALTER TABLE plan_master DROP COLUMN IF EXISTS is_ale_plan;

-- Employee Census
ALTER TABLE employee_census ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(50);
ALTER TABLE employee_census ADD COLUMN IF NOT EXISTS employment_type_code VARCHAR(50);

-- Payroll Hours
ALTER TABLE payroll_hours ADD COLUMN IF NOT EXISTS gross_wages NUMERIC(15, 2);
ALTER TABLE payroll_hours ADD COLUMN IF NOT EXISTS month INTEGER;

-- Company Details
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Employee Plan Eligibility
ALTER TABLE employee_plan_eligibility ADD COLUMN IF NOT EXISTS benefit_class VARCHAR(100);
ALTER TABLE employee_plan_eligibility ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(50);
ALTER TABLE employee_plan_eligibility ADD COLUMN IF NOT EXISTS option_code VARCHAR(50);
ALTER TABLE employee_plan_eligibility ADD COLUMN IF NOT EXISTS plan_cost NUMERIC(10, 2);

-- Employee Plan Enrollment
ALTER TABLE employee_plan_enrollment ADD COLUMN IF NOT EXISTS enrollment_event VARCHAR(50);
ALTER TABLE employee_plan_enrollment ADD COLUMN IF NOT EXISTS option_code VARCHAR(50);

-- Update Stored Procedures

-- Upsert Plan Master
CREATE OR REPLACE FUNCTION upsert_plan_master(
    p_company_code VARCHAR,
    p_plan_code VARCHAR,
    p_plan_name VARCHAR,
    p_plan_type VARCHAR DEFAULT NULL,
    p_mvc BOOLEAN DEFAULT FALSE,
    p_me BOOLEAN DEFAULT FALSE,
    p_plan_affordable_cost NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO plan_master (
        company_code, plan_code, plan_name, plan_type,
        mvc, me, plan_affordable_cost, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_plan_code, p_plan_name, p_plan_type,
        p_mvc, p_me, p_plan_affordable_cost, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        plan_type = EXCLUDED.plan_type,
        mvc = EXCLUDED.mvc,
        me = EXCLUDED.me,
        plan_affordable_cost = EXCLUDED.plan_affordable_cost,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'plan_code', p_plan_code);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert Employee Census
CREATE OR REPLACE FUNCTION upsert_employee_census(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_middle_name VARCHAR DEFAULT NULL,
    p_ssn VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_hire_date DATE DEFAULT NULL,
    p_termination_date DATE DEFAULT NULL,
    p_employment_status VARCHAR DEFAULT NULL,
    p_job_title VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_full_time_equivalent NUMERIC DEFAULT NULL,
    p_pay_frequency VARCHAR DEFAULT NULL,
    p_employment_type_code VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_census (
        company_code, employee_id, first_name, middle_name, last_name, ssn,
        date_of_birth, gender, hire_date, termination_date, employment_status,
        job_title, department, full_time_equivalent, pay_frequency, employment_type_code,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_first_name, p_middle_name, p_last_name, p_ssn,
        p_date_of_birth, p_gender, p_hire_date, p_termination_date, p_employment_status,
        p_job_title, p_department, p_full_time_equivalent, p_pay_frequency, p_employment_type_code,
        p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        ssn = EXCLUDED.ssn,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        hire_date = EXCLUDED.hire_date,
        termination_date = EXCLUDED.termination_date,
        employment_status = EXCLUDED.employment_status,
        job_title = EXCLUDED.job_title,
        department = EXCLUDED.department,
        full_time_equivalent = EXCLUDED.full_time_equivalent,
        pay_frequency = EXCLUDED.pay_frequency,
        employment_type_code = EXCLUDED.employment_type_code,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'employee_id', p_employee_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert Employee Plan Eligibility
CREATE OR REPLACE FUNCTION upsert_employee_plan_eligibility(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_plan_code VARCHAR,
    p_eligibility_start_date DATE,
    p_eligibility_end_date DATE DEFAULT NULL,
    p_eligibility_status VARCHAR DEFAULT NULL,
    p_benefit_class VARCHAR DEFAULT NULL,
    p_measurement_type VARCHAR DEFAULT NULL,
    p_option_code VARCHAR DEFAULT NULL,
    p_plan_cost NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_eligibility (
        company_code, employee_id, plan_code, eligibility_start_date, eligibility_end_date,
        eligibility_status, benefit_class, measurement_type, option_code, plan_cost,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_plan_code, p_eligibility_start_date, p_eligibility_end_date,
        p_eligibility_status, p_benefit_class, p_measurement_type, p_option_code, p_plan_cost,
        p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, plan_code, eligibility_start_date) DO UPDATE SET
        eligibility_end_date = EXCLUDED.eligibility_end_date,
        eligibility_status = EXCLUDED.eligibility_status,
        benefit_class = EXCLUDED.benefit_class,
        measurement_type = EXCLUDED.measurement_type,
        option_code = EXCLUDED.option_code,
        plan_cost = EXCLUDED.plan_cost,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert Employee Plan Enrollment
CREATE OR REPLACE FUNCTION upsert_employee_plan_enrollment(
    p_enrollment_id VARCHAR,
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_plan_code VARCHAR,
    p_enrollment_date DATE,
    p_effective_date DATE,
    p_termination_date DATE DEFAULT NULL,
    p_coverage_tier VARCHAR DEFAULT NULL,
    p_enrollment_status VARCHAR DEFAULT NULL,
    p_enrollment_event VARCHAR DEFAULT NULL,
    p_option_code VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_enrollment (
        enrollment_id, company_code, employee_id, plan_code, enrollment_date,
        effective_date, termination_date, coverage_tier, enrollment_status,
        enrollment_event, option_code, add_name, add_date, updated_at
    ) VALUES (
        p_enrollment_id, p_company_code, p_employee_id, p_plan_code, p_enrollment_date,
        p_effective_date, p_termination_date, p_coverage_tier, p_enrollment_status,
        p_enrollment_event, p_option_code, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (enrollment_id) DO UPDATE SET
        company_code = EXCLUDED.company_code,
        employee_id = EXCLUDED.employee_id,
        plan_code = EXCLUDED.plan_code,
        enrollment_date = EXCLUDED.enrollment_date,
        effective_date = EXCLUDED.effective_date,
        termination_date = EXCLUDED.termination_date,
        coverage_tier = EXCLUDED.coverage_tier,
        enrollment_status = EXCLUDED.enrollment_status,
        enrollment_event = EXCLUDED.enrollment_event,
        option_code = EXCLUDED.option_code,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'enrollment_id', p_enrollment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert Payroll Hours
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
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO payroll_hours (
        company_code, employee_id, pay_period_start, pay_period_end,
        hours_worked, regular_hours, overtime_hours, gross_wages, month,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_pay_period_start, p_pay_period_end,
        p_hours_worked, p_regular_hours, p_overtime_hours, p_gross_wages, p_month,
        p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, pay_period_start) DO UPDATE SET
        pay_period_end = EXCLUDED.pay_period_end,
        hours_worked = EXCLUDED.hours_worked,
        regular_hours = EXCLUDED.regular_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        gross_wages = EXCLUDED.gross_wages,
        month = EXCLUDED.month,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert Company Details
CREATE OR REPLACE FUNCTION upsert_company_details(
    p_company_code VARCHAR,
    p_company_name VARCHAR,
    p_dba_name VARCHAR DEFAULT NULL,
    p_ein VARCHAR DEFAULT NULL,
    p_address_line_1 VARCHAR DEFAULT NULL,
    p_address_line_2 VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_zip_code VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_contact_name VARCHAR DEFAULT NULL,
    p_contact_phone VARCHAR DEFAULT NULL,
    p_contact_email VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_details (
        company_code, company_name, dba_name, ein, address_line_1, address_line_2,
        city, state, zip_code, country, contact_name, contact_phone, contact_email,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_country, p_contact_name, p_contact_phone, p_contact_email,
        p_add_name, p_add_date, NOW()
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
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'company_code', p_company_code);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
