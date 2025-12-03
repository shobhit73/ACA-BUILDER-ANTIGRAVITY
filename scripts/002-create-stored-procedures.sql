-- Stored Procedure: Upsert Company Details
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
    p_contact_name VARCHAR DEFAULT NULL,
    p_contact_phone VARCHAR DEFAULT NULL,
    p_contact_email VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_details (
        company_code, company_name, dba_name, ein, address_line_1, address_line_2,
        city, state, zip_code, contact_name, contact_phone, contact_email,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_contact_name, p_contact_phone, p_contact_email,
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

-- Stored Procedure: Upsert Plan Master
CREATE OR REPLACE FUNCTION upsert_plan_master(
    p_company_code VARCHAR,
    p_plan_code VARCHAR,
    p_plan_name VARCHAR,
    p_plan_type VARCHAR DEFAULT NULL,
    p_coverage_type VARCHAR DEFAULT NULL,
    p_is_ale_plan BOOLEAN DEFAULT FALSE,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO plan_master (
        company_code, plan_code, plan_name, plan_type, coverage_type,
        is_ale_plan, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_plan_code, p_plan_name, p_plan_type, p_coverage_type,
        p_is_ale_plan, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        plan_type = EXCLUDED.plan_type,
        coverage_type = EXCLUDED.coverage_type,
        is_ale_plan = EXCLUDED.is_ale_plan,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'plan_code', p_plan_code);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Census
CREATE OR REPLACE FUNCTION upsert_employee_census(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_first_name VARCHAR,
    p_middle_name VARCHAR DEFAULT NULL,
    p_last_name VARCHAR,
    p_ssn VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_hire_date DATE DEFAULT NULL,
    p_termination_date DATE DEFAULT NULL,
    p_employment_status VARCHAR DEFAULT NULL,
    p_job_title VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_full_time_equivalent NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_census (
        company_code, employee_id, first_name, middle_name, last_name, ssn,
        date_of_birth, gender, hire_date, termination_date, employment_status,
        job_title, department, full_time_equivalent, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_first_name, p_middle_name, p_last_name, p_ssn,
        p_date_of_birth, p_gender, p_hire_date, p_termination_date, p_employment_status,
        p_job_title, p_department, p_full_time_equivalent, p_add_name, p_add_date, NOW()
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
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'employee_id', p_employee_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Address
CREATE OR REPLACE FUNCTION upsert_employee_address(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_effective_date DATE,
    p_address_line_1 VARCHAR DEFAULT NULL,
    p_address_line_2 VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_zip_code VARCHAR DEFAULT NULL,
    p_county VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_address (
        company_code, employee_id, effective_date, address_line_1, address_line_2,
        city, state, zip_code, county, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_effective_date, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_county, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, effective_date) DO UPDATE SET
        address_line_1 = EXCLUDED.address_line_1,
        address_line_2 = EXCLUDED.address_line_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        county = EXCLUDED.county,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Waiting Period
CREATE OR REPLACE FUNCTION upsert_employee_waiting_period(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_waiting_period_end_date DATE DEFAULT NULL,
    p_is_waiting_period_waived BOOLEAN DEFAULT FALSE,
    p_waiver_reason TEXT DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_waiting_period (
        company_code, employee_id, waiting_period_end_date, is_waiting_period_waived,
        waiver_reason, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_waiting_period_end_date, p_is_waiting_period_waived,
        p_waiver_reason, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id) DO UPDATE SET
        waiting_period_end_date = EXCLUDED.waiting_period_end_date,
        is_waiting_period_waived = EXCLUDED.is_waiting_period_waived,
        waiver_reason = EXCLUDED.waiver_reason,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Plan Eligibility
CREATE OR REPLACE FUNCTION upsert_employee_plan_eligibility(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_plan_code VARCHAR,
    p_eligibility_start_date DATE,
    p_eligibility_end_date DATE DEFAULT NULL,
    p_eligibility_status VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_eligibility (
        company_code, employee_id, plan_code, eligibility_start_date, eligibility_end_date,
        eligibility_status, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_plan_code, p_eligibility_start_date, p_eligibility_end_date,
        p_eligibility_status, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, plan_code, eligibility_start_date) DO UPDATE SET
        eligibility_end_date = EXCLUDED.eligibility_end_date,
        eligibility_status = EXCLUDED.eligibility_status,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Plan Enrollment
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
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_enrollment (
        enrollment_id, company_code, employee_id, plan_code, enrollment_date, effective_date,
        termination_date, coverage_tier, enrollment_status, add_name, add_date, updated_at
    ) VALUES (
        p_enrollment_id, p_company_code, p_employee_id, p_plan_code, p_enrollment_date, p_effective_date,
        p_termination_date, p_coverage_tier, p_enrollment_status, p_add_name, p_add_date, NOW()
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
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'enrollment_id', p_enrollment_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Employee Dependent
CREATE OR REPLACE FUNCTION upsert_employee_dependent(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_dependent_id VARCHAR,
    p_first_name VARCHAR,
    p_middle_name VARCHAR DEFAULT NULL,
    p_last_name VARCHAR,
    p_ssn VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_relationship VARCHAR DEFAULT NULL,
    p_is_disabled BOOLEAN DEFAULT FALSE,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_dependent (
        company_code, employee_id, dependent_id, first_name, middle_name, last_name,
        ssn, date_of_birth, gender, relationship, is_disabled, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_dependent_id, p_first_name, p_middle_name, p_last_name,
        p_ssn, p_date_of_birth, p_gender, p_relationship, p_is_disabled, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, dependent_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        ssn = EXCLUDED.ssn,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        relationship = EXCLUDED.relationship,
        is_disabled = EXCLUDED.is_disabled,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'dependent_id', p_dependent_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Plan Enrollment Cost
CREATE OR REPLACE FUNCTION upsert_plan_enrollment_cost(
    p_enrollment_id VARCHAR,
    p_cost_period_start DATE,
    p_cost_period_end DATE,
    p_employee_cost NUMERIC DEFAULT NULL,
    p_employer_cost NUMERIC DEFAULT NULL,
    p_total_cost NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO plan_enrollment_cost (
        enrollment_id, cost_period_start, cost_period_end, employee_cost, employer_cost,
        total_cost, add_name, add_date, updated_at
    ) VALUES (
        p_enrollment_id, p_cost_period_start, p_cost_period_end, p_employee_cost, p_employer_cost,
        p_total_cost, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (enrollment_id, cost_period_start) DO UPDATE SET
        cost_period_end = EXCLUDED.cost_period_end,
        employee_cost = EXCLUDED.employee_cost,
        employer_cost = EXCLUDED.employer_cost,
        total_cost = EXCLUDED.total_cost,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Upsert Payroll Hours
CREATE OR REPLACE FUNCTION upsert_payroll_hours(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_pay_period_start DATE,
    p_pay_period_end DATE,
    p_hours_worked NUMERIC DEFAULT NULL,
    p_regular_hours NUMERIC DEFAULT NULL,
    p_overtime_hours NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO payroll_hours (
        company_code, employee_id, pay_period_start, pay_period_end, hours_worked,
        regular_hours, overtime_hours, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_pay_period_start, p_pay_period_end, p_hours_worked,
        p_regular_hours, p_overtime_hours, p_add_name, p_add_date, NOW()
    )
    ON CONFLICT (company_code, employee_id, pay_period_start) DO UPDATE SET
        pay_period_end = EXCLUDED.pay_period_end,
        hours_worked = EXCLUDED.hours_worked,
        regular_hours = EXCLUDED.regular_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
