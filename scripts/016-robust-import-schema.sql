-- 1. Company Details Updates
ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_agg_ale_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cert_qualifying_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cert_98_percent_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

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
    p_is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
    p_is_agg_ale_group BOOLEAN DEFAULT FALSE,
    p_cert_qualifying_offer BOOLEAN DEFAULT FALSE,
    p_cert_98_percent_offer BOOLEAN DEFAULT FALSE,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_details (
        company_code, company_name, dba_name, ein, address_line_1, address_line_2,
        city, state, zip_code, country, contact_name, contact_phone, contact_email,
        is_authoritative_transmittal, is_agg_ale_group, cert_qualifying_offer, cert_98_percent_offer,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_country, p_contact_name, p_contact_phone, p_contact_email,
        p_is_authoritative_transmittal, p_is_agg_ale_group, p_cert_qualifying_offer, p_cert_98_percent_offer,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
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
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'company_code', p_company_code);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 2. Plan Master Updates
ALTER TABLE plan_master 
ADD COLUMN IF NOT EXISTS option_emp NUMERIC,
ADD COLUMN IF NOT EXISTS option_emp_spouse NUMERIC,
ADD COLUMN IF NOT EXISTS option_emp_child NUMERIC,
ADD COLUMN IF NOT EXISTS option_emp_family NUMERIC,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION upsert_plan_master(
    p_company_code VARCHAR,
    p_plan_code VARCHAR,
    p_plan_name VARCHAR,
    p_plan_type VARCHAR DEFAULT NULL,
    p_mvc BOOLEAN DEFAULT FALSE,
    p_me BOOLEAN DEFAULT FALSE,
    p_plan_affordable_cost NUMERIC DEFAULT NULL,
    p_option_emp NUMERIC DEFAULT NULL,
    p_option_emp_spouse NUMERIC DEFAULT NULL,
    p_option_emp_child NUMERIC DEFAULT NULL,
    p_option_emp_family NUMERIC DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO plan_master (
        company_code, plan_code, plan_name, plan_type, mvc, me, plan_affordable_cost,
        option_emp, option_emp_spouse, option_emp_child, option_emp_family,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_plan_code, p_plan_name, p_plan_type, p_mvc, p_me, p_plan_affordable_cost,
        p_option_emp, p_option_emp_spouse, p_option_emp_child, p_option_emp_family,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    ON CONFLICT (company_code, plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        plan_type = EXCLUDED.plan_type,
        mvc = EXCLUDED.mvc,
        me = EXCLUDED.me,
        plan_affordable_cost = EXCLUDED.plan_affordable_cost,
        option_emp = EXCLUDED.option_emp,
        option_emp_spouse = EXCLUDED.option_emp_spouse,
        option_emp_child = EXCLUDED.option_emp_child,
        option_emp_family = EXCLUDED.option_emp_family,
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

-- 3. Employee Census Updates
ALTER TABLE employee_census
ADD COLUMN IF NOT EXISTS employee_category VARCHAR,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION upsert_employee_census(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_first_name VARCHAR,
    p_middle_name VARCHAR DEFAULT NULL,
    p_last_name VARCHAR DEFAULT NULL,
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
    p_email VARCHAR DEFAULT NULL,
    p_employee_category VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_census (
        company_code, employee_id, first_name, middle_name, last_name, ssn,
        date_of_birth, gender, hire_date, termination_date, employment_status,
        job_title, department, full_time_equivalent, pay_frequency, employment_type_code, email,
        employee_category, notes,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_first_name, p_middle_name, p_last_name, p_ssn,
        p_date_of_birth, p_gender, p_hire_date, p_termination_date, p_employment_status,
        p_job_title, p_department, p_full_time_equivalent, p_pay_frequency, p_employment_type_code, p_email,
        p_employee_category, p_notes,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
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
        email = EXCLUDED.email,
        employee_category = EXCLUDED.employee_category,
        notes = EXCLUDED.notes,
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

-- 4. Employee Address Updates
ALTER TABLE employee_address
ADD COLUMN IF NOT EXISTS address_end_date DATE,
ADD COLUMN IF NOT EXISTS country VARCHAR,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

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
    p_country VARCHAR DEFAULT NULL,
    p_address_end_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_address (
        company_code, employee_id, effective_date, address_line_1, address_line_2,
        city, state, zip_code, county, country, address_end_date, notes,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_effective_date, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_county, p_country, p_address_end_date, p_notes,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    ON CONFLICT (company_code, employee_id, effective_date) DO UPDATE SET
        address_line_1 = EXCLUDED.address_line_1,
        address_line_2 = EXCLUDED.address_line_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        county = EXCLUDED.county,
        country = EXCLUDED.country,
        address_end_date = EXCLUDED.address_end_date,
        notes = EXCLUDED.notes,
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

-- 5. Employee Waiting Period Updates
ALTER TABLE employee_waiting_period
ADD COLUMN IF NOT EXISTS plan_code VARCHAR,
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS wait_period_days INTEGER,
ADD COLUMN IF NOT EXISTS category_code VARCHAR,
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR,
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION upsert_employee_waiting_period(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_plan_code VARCHAR DEFAULT NULL,
    p_effective_date DATE DEFAULT NULL,
    p_waiting_period_end_date DATE DEFAULT NULL,
    p_wait_period_days INTEGER DEFAULT NULL,
    p_is_waiting_period_waived BOOLEAN DEFAULT FALSE,
    p_waiver_reason VARCHAR DEFAULT NULL,
    p_category_code VARCHAR DEFAULT NULL,
    p_benefit_class VARCHAR DEFAULT NULL,
    p_measurement_type VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_waiting_period (
        company_code, employee_id, plan_code, effective_date,
        waiting_period_end_date, wait_period_days,
        is_waiting_period_waived, waiver_reason,
        category_code, benefit_class, measurement_type,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_plan_code, p_effective_date,
        p_waiting_period_end_date, p_wait_period_days,
        p_is_waiting_period_waived, p_waiver_reason,
        p_category_code, p_benefit_class, p_measurement_type,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    ON CONFLICT (company_code, employee_id) DO UPDATE SET -- Warning: constraint might technically include date/plan
        plan_code = EXCLUDED.plan_code,
        effective_date = EXCLUDED.effective_date,
        waiting_period_end_date = EXCLUDED.waiting_period_end_date,
        wait_period_days = EXCLUDED.wait_period_days,
        is_waiting_period_waived = EXCLUDED.is_waiting_period_waived,
        waiver_reason = EXCLUDED.waiver_reason,
        category_code = EXCLUDED.category_code,
        benefit_class = EXCLUDED.benefit_class,
        measurement_type = EXCLUDED.measurement_type,
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

-- 6. Employee Plan Eligibility Updates
ALTER TABLE employee_plan_eligibility
ADD COLUMN IF NOT EXISTS category_code VARCHAR,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

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
    p_category_code VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_eligibility (
        company_code, employee_id, plan_code, eligibility_start_date,
        eligibility_end_date, eligibility_status, benefit_class, measurement_type,
        option_code, plan_cost, category_code,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_plan_code, p_eligibility_start_date,
        p_eligibility_end_date, p_eligibility_status, p_benefit_class, p_measurement_type,
        p_option_code, p_plan_cost, p_category_code,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    ON CONFLICT (company_code, employee_id, plan_code, eligibility_start_date) DO UPDATE SET
        eligibility_end_date = EXCLUDED.eligibility_end_date,
        eligibility_status = EXCLUDED.eligibility_status,
        benefit_class = EXCLUDED.benefit_class,
        measurement_type = EXCLUDED.measurement_type,
        option_code = EXCLUDED.option_code,
        plan_cost = EXCLUDED.plan_cost,
        category_code = EXCLUDED.category_code,
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

-- 7. Employee Plan Enrollment Updates
ALTER TABLE employee_plan_enrollment
ADD COLUMN IF NOT EXISTS category_code VARCHAR,
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR,
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

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
    p_category_code VARCHAR DEFAULT NULL,
    p_benefit_class VARCHAR DEFAULT NULL,
    p_measurement_type VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_plan_enrollment (
        enrollment_id, company_code, employee_id, plan_code,
        enrollment_date, effective_date, termination_date,
        coverage_tier, enrollment_status, enrollment_event, option_code,
        category_code, benefit_class, measurement_type,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_enrollment_id, p_company_code, p_employee_id, p_plan_code,
        p_enrollment_date, p_effective_date, p_termination_date,
        p_coverage_tier, p_enrollment_status, p_enrollment_event, p_option_code,
        p_category_code, p_benefit_class, p_measurement_type,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
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
        category_code = EXCLUDED.category_code,
        benefit_class = EXCLUDED.benefit_class,
        measurement_type = EXCLUDED.measurement_type,
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

-- 8. Employee Dependent Updates
ALTER TABLE employee_dependent
ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION upsert_employee_dependent(
    p_company_code VARCHAR,
    p_employee_id VARCHAR,
    p_dependent_id VARCHAR,
    p_first_name VARCHAR,
    p_middle_name VARCHAR DEFAULT NULL,
    p_last_name VARCHAR DEFAULT NULL,
    p_ssn VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_relationship VARCHAR DEFAULT NULL,
    p_is_disabled BOOLEAN DEFAULT FALSE,
    p_enrollment_id VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_dependent (
        company_code, employee_id, dependent_id,
        first_name, middle_name, last_name, ssn,
        date_of_birth, gender, relationship, is_disabled,
        enrollment_id,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_dependent_id,
        p_first_name, p_middle_name, p_last_name, p_ssn,
        p_date_of_birth, p_gender, p_relationship, p_is_disabled,
        p_enrollment_id,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
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
        enrollment_id = EXCLUDED.enrollment_id,
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

-- 9. Plan Enrollment Cost Updates
ALTER TABLE plan_enrollment_cost
ADD COLUMN IF NOT EXISTS coverage_id VARCHAR,
ADD COLUMN IF NOT EXISTS category_code VARCHAR,
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR,
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION upsert_plan_enrollment_cost(
    p_enrollment_id VARCHAR,
    p_cost_period_start DATE,
    p_cost_period_end DATE DEFAULT NULL,
    p_employee_cost NUMERIC DEFAULT NULL,
    p_employer_cost NUMERIC DEFAULT NULL,
    p_total_cost NUMERIC DEFAULT NULL,
    p_coverage_id VARCHAR DEFAULT NULL,
    p_category_code VARCHAR DEFAULT NULL,
    p_benefit_class VARCHAR DEFAULT NULL,
    p_measurement_type VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
BEGIN
    INSERT INTO plan_enrollment_cost (
        enrollment_id, cost_period_start, cost_period_end,
        employee_cost, employer_cost, total_cost,
        coverage_id, category_code, benefit_class, measurement_type,
        add_name, add_date, modified_by, modified_on, updated_at
    ) VALUES (
        p_enrollment_id, p_cost_period_start, p_cost_period_end,
        p_employee_cost, p_employer_cost, p_total_cost,
        p_coverage_id, p_category_code, p_benefit_class, p_measurement_type,
        p_add_name, p_add_date, p_modified_by, p_modified_on, NOW()
    )
    ON CONFLICT (enrollment_id, cost_period_start) DO UPDATE SET
        cost_period_end = EXCLUDED.cost_period_end,
        employee_cost = EXCLUDED.employee_cost,
        employer_cost = EXCLUDED.employer_cost,
        total_cost = EXCLUDED.total_cost,
        coverage_id = EXCLUDED.coverage_id,
        category_code = EXCLUDED.category_code,
        benefit_class = EXCLUDED.benefit_class,
        measurement_type = EXCLUDED.measurement_type,
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

-- 10. Payroll Hours Updates
ALTER TABLE payroll_hours
ADD COLUMN IF NOT EXISTS add_name VARCHAR,
ADD COLUMN IF NOT EXISTS add_date DATE,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

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
    ON CONFLICT (company_code, employee_id, pay_period_start, pay_period_end) DO UPDATE SET
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
