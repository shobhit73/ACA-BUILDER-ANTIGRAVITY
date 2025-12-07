-- 004-consolidated-functions.sql
-- Consolidated Stored Procedures & Triggers
-- Merges: 104 (Upserts), 107 (ACA V2), 009 (Final Report), 011 (Penalty), 013 (User Trigger)

-- ==========================================
-- 1. User Management Triggers
-- ==========================================


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'employee'; -- Default role
    v_first_name TEXT;
    v_last_name TEXT;
    v_company_code TEXT;
    v_census_id UUID;
BEGIN
    BEGIN
        -- 1. Check if user exists in employee_census (Employee Persona)
        SELECT id, first_name, last_name, company_code 
        INTO v_census_id, v_first_name, v_last_name, v_company_code
        FROM employee_census
        WHERE email = NEW.email
        LIMIT 1;

        IF v_census_id IS NOT NULL THEN
            -- Link user to census
            BEGIN
                UPDATE employee_census SET user_id = NEW.id WHERE id = v_census_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to update employee_census for user %: %', NEW.email, SQLERRM;
            END;
            v_role := 'employee';
            
            -- Use census names if available
            IF v_first_name IS NULL THEN v_first_name := NEW.raw_user_meta_data->>'first_name'; END IF;
            IF v_last_name IS NULL THEN v_last_name := NEW.raw_user_meta_data->>'last_name'; END IF;
        ELSE
            -- 2. Fallback to metadata
            v_first_name := NEW.raw_user_meta_data->>'first_name';
            v_last_name := NEW.raw_user_meta_data->>'last_name';
            v_company_code := NEW.raw_user_meta_data->>'company_code'; -- Fallback if passed in metadata
            
            IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
                v_role := 'system_admin';
            ELSIF NEW.raw_user_meta_data->>'role' = 'company_admin' THEN
                v_role := 'employer_admin';
            ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
                v_role := NEW.raw_user_meta_data->>'role';
            END IF;
        END IF;

        -- Upsert into profiles (Fixes duplicate key error if profile exists)
        INSERT INTO public.profiles (id, email, role, first_name, last_name, company_code, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            v_role,
            v_first_name,
            v_last_name,
            v_company_code,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
            company_code = COALESCE(EXCLUDED.company_code, profiles.company_code),
            updated_at = NOW();
            
    EXCEPTION WHEN OTHERS THEN
        -- Catch any error to ensure auth user creation doesn't fail
        RAISE WARNING 'Profile creation failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2. Data Upsert Functions (from script 104)
-- ==========================================

-- Upsert Company Details
CREATE OR REPLACE FUNCTION upsert_company_details(
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

-- Upsert Payroll Hours (Fixed 3-key conflict)
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
    ON CONFLICT (company_code, employee_id, pay_period_start) DO UPDATE SET
        pay_period_end = EXCLUDED.pay_period_end,
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

-- Upsert Plan Master
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

-- Upsert Employee Census (Robust)
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
    
    RETURN json_build_object('success', true, 'employee_id', p_employee_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- Upsert Employee Address
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

-- Upsert Employee Waiting Period
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
    ON CONFLICT (company_code, employee_id) DO UPDATE SET
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

-- Upsert Employee Dependent
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

-- Upsert Plan Enrollment Cost
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


-- ==========================================
-- 3. ACA Generation & Reporting (V2 Logic)
-- ==========================================

-- Interim Generation (Renamed V2 -> Standard)
CREATE OR REPLACE FUNCTION generate_aca_monthly_interim(
    p_company_code VARCHAR,
    p_tax_year INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_month INTEGER;
    v_month_start DATE;
    v_month_end DATE;
    v_employee_count INTEGER := 0;
    v_payroll_count INTEGER := 0;
    v_eligibility_count INTEGER := 0;
    v_enrollment_count INTEGER := 0;
    v_generated_status INTEGER := 0;
    v_generated_offer INTEGER := 0;
    v_generated_enrollment INTEGER := 0;
BEGIN
    -- Log start
    RAISE NOTICE '[v2] Starting ACA interim table generation for company: %, tax year: %', p_company_code, p_tax_year;
    
    -- Clear existing data for this company and tax year
    DELETE FROM aca_employee_monthly_status 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_offer 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_enrollment 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    -- Count source data
    SELECT COUNT(*) INTO v_employee_count
    FROM employee_census
    WHERE company_code = p_company_code
    AND (hire_date IS NULL OR EXTRACT(YEAR FROM hire_date) <= p_tax_year)
    AND (termination_date IS NULL OR EXTRACT(YEAR FROM termination_date) >= p_tax_year);
    
    RAISE NOTICE '[v2] Employee count: %', v_employee_count;

    -- Loop through each month
    FOR v_month IN 1..12 LOOP
        v_month_start := make_date(p_tax_year, v_month, 1);
        v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        
        -- ===== POPULATE aca_employee_monthly_status =====
        -- Guaranteed 1 row per employee per month
        INSERT INTO aca_employee_monthly_status (
            company_code, employee_id, tax_year, month,
            month_start_date, month_end_date, employed_in_month,
            hired_during_month, terminated_during_month,
            employment_status_end_of_month, hours_of_service, full_time_flag,
            waiting_period_month, waiting_period_waived, -- Explicitly set defaults
            add_name, add_date
        )
        SELECT 
            ec.company_code,
            ec.employee_id,
            p_tax_year,
            v_month,
            v_month_start,
            v_month_end,
            -- Logic: Employed if Hire date <= month end AND (Term IS NULL OR Term >= month start)
            -- Use COALESCE to ensure boolean result (though logic below should be safe, explicit is better)
            COALESCE((ec.hire_date <= v_month_end AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start)), FALSE),
            
            -- Hired during month: hire_date between start/end. Handle NULL hire_date just in case.
            COALESCE((ec.hire_date >= v_month_start AND ec.hire_date <= v_month_end), FALSE),
            
            -- Terminiated during month: term_date between start/end. Handle NULL term_date explicitly.
            COALESCE((ec.termination_date >= v_month_start AND ec.termination_date <= v_month_end), FALSE),
            CASE 
                WHEN ec.termination_date < v_month_start THEN 'Terminated'
                WHEN ec.hire_date > v_month_end THEN 'Not Hired'
                ELSE ec.employment_status
            END,
            COALESCE(
                (SELECT SUM(hours_worked) 
                 FROM payroll_hours ph
                 WHERE ph.company_code = ec.company_code
                 AND ph.employee_id = ec.employee_id
                 AND ph.pay_period_start >= v_month_start
                 AND ph.pay_period_start <= v_month_end),
                0
            ),
            COALESCE(
                (SELECT SUM(hours_worked) 
                 FROM payroll_hours ph
                 WHERE ph.company_code = ec.company_code
                 AND ph.employee_id = ec.employee_id
                 AND ph.pay_period_start >= v_month_start
                 AND ph.pay_period_start <= v_month_end),
                0
            ) >= 130,
            FALSE, -- waiting_period_month default
            FALSE, -- waiting_period_waived default
            'generate_aca_monthly_interim_v2',
            CURRENT_DATE
        FROM employee_census ec
        WHERE ec.company_code = p_company_code
        AND (ec.hire_date IS NULL OR ec.hire_date <= v_month_end)
        AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
        
        -- ===== POPULATE aca_employee_monthly_offer =====
        -- Join status table (1 row) with aggregated eligibility (1 row) -> Guaranteed 1 row
        INSERT INTO aca_employee_monthly_offer (
            company_code, employee_id, tax_year, month,
            offer_of_coverage, coverage_tier_offered, plan_code,
            eligible_for_coverage, eligibility_start_date, eligibility_end_date,
            is_eligible_emp, is_eligible_spouse, is_eligible_child, is_eligible_family,
            add_name, add_date
        )
        SELECT 
            ems.company_code,
            ems.employee_id,
            ems.tax_year,
            ems.month,
            COALESCE(agg.has_offer, false),
            agg.coverage_tier_offered,
            agg.plan_code,
            COALESCE(agg.has_offer, false),
            agg.start_date,
            agg.end_date,
            -- Determine flags based on Plan Master config
            (agg.has_offer AND pm.option_emp IS NOT NULL),
            (agg.has_offer AND pm.option_emp_spouse IS NOT NULL),
            (agg.has_offer AND pm.option_emp_child IS NOT NULL),
            (agg.has_offer AND pm.option_emp_family IS NOT NULL),
            'generate_aca_monthly_interim_v2',
            CURRENT_DATE
        FROM aca_employee_monthly_status ems
        LEFT JOIN LATERAL (
            -- Aggregated eligibility to ensure distinctness
            SELECT 
                bool_or(true) as has_offer,
                MAX(epe.plan_code) as plan_code, 
                MIN(epe.eligibility_start_date) as start_date,
                MAX(epe.eligibility_end_date) as end_date,
                NULL::varchar as coverage_tier_offered -- Simplification for now to match schema
            FROM employee_plan_eligibility epe 
            WHERE epe.company_code = ems.company_code
            AND epe.employee_id = ems.employee_id
            AND epe.eligibility_start_date <= ems.month_end_date
            AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= ems.month_start_date)
        ) agg ON TRUE
        -- Join Plan Master to get eligibility breakdown
        LEFT JOIN plan_master pm ON pm.company_code = ems.company_code AND pm.plan_code = agg.plan_code
        WHERE ems.company_code = p_company_code
        AND ems.tax_year = p_tax_year
        AND ems.month = v_month;

        -- ===== POPULATE aca_employee_monthly_enrollment =====
        INSERT INTO aca_employee_monthly_enrollment (
            company_code, employee_id, tax_year, month,
            enrolled_in_coverage, plan_code, employee_cost, employer_cost, total_cost,
            coverage_tier, enrollment_id,
            add_name, add_date
        )
        SELECT 
            ems.company_code,
            ems.employee_id,
            ems.tax_year,
            ems.month,
            CASE WHEN epe_enroll.enrollment_id IS NOT NULL THEN true ELSE false END,
            epe_enroll.plan_code,
            pec.employee_cost,
            pec.employer_cost,
            pec.total_cost,
            epe_enroll.coverage_tier,
            epe_enroll.enrollment_id,
           'generate_aca_monthly_interim_v2',
            CURRENT_DATE
        FROM aca_employee_monthly_status ems
        LEFT JOIN LATERAL (
            SELECT * FROM employee_plan_enrollment epe 
            WHERE epe.company_code = ems.company_code
            AND epe.employee_id = ems.employee_id
            AND epe.effective_date <= ems.month_end_date
            AND (epe.termination_date IS NULL OR epe.termination_date >= ems.month_start_date)
            ORDER BY epe.effective_date DESC
            LIMIT 1
        ) epe_enroll ON TRUE
        LEFT JOIN LATERAL (
            SELECT * FROM plan_enrollment_cost pec
            WHERE pec.enrollment_id = epe_enroll.enrollment_id
            AND pec.cost_period_start <= ems.month_end_date
            AND pec.cost_period_end >= ems.month_start_date
            ORDER BY pec.cost_period_start DESC
            LIMIT 1
        ) pec ON TRUE
        WHERE ems.company_code = p_company_code
        AND ems.tax_year = p_tax_year
        AND ems.month = v_month;
        
    END LOOP;
    
    RETURN json_build_object('success', true, 'message', 'Generated successfully (V2)');
    
    -- Removed Exception block to bubble up info, or re-add if needed.
    -- Re-adding simplified generic catch
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in V2 generation: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Final Report Generation
CREATE OR REPLACE FUNCTION generate_aca_final_report(
    p_company_code VARCHAR,
    p_tax_year INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_month INTEGER;
    v_generated_count INTEGER := 0;
    v_total_inserted INTEGER := 0;
BEGIN
    -- Log Start
    RAISE NOTICE 'Starting generate_aca_final_report for Co: %, Year: %', p_company_code, p_tax_year;

    -- Clear existing report data for this company/year
    DELETE FROM aca_final_report 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    RAISE NOTICE 'Cleared old records';

    -- Loop through months 1-12
    FOR v_month IN 1..12 LOOP
        RAISE NOTICE 'Processing Month: %', v_month;
        
        INSERT INTO aca_final_report (
            company_code, employee_id, tax_year, month,
            line_14_code, line_15_cost, line_16_code
        )
        WITH initial_calc AS (
            SELECT
                status.company_code,
                status.employee_id,
                p_tax_year as tax_year,
                v_month as month,
                
                -- ==========================
                -- LINE 14 LOGIC (Initial)
                -- ==========================
                CASE
                    -- 1H: No Offer OR Not MEC (ME='N')
                    WHEN offer.offer_of_coverage IS NULL OR offer.offer_of_coverage = false OR pm.me = 'N' THEN '1H'
                    
                    -- 1F: MEC but No MV (ME='Y', MVC='N')
                    WHEN pm.me = 'Y' AND pm.mvc = 'N' THEN '1F'
                    
                    -- 1A: Full Time + MEC/MV + Family + Emp + Affordable ($50)
                    WHEN status.full_time_flag IS TRUE 
                         AND pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_family IS TRUE 
                         AND offer.is_eligible_emp IS TRUE
                         AND COALESCE(pm.option_emp, 99999) <= 50 THEN '1A'
                         
                    -- 1E: Full Time + MEC/MV + Family + Emp + Not Affordable
                    WHEN status.full_time_flag IS TRUE 
                         AND pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_family IS TRUE 
                         AND offer.is_eligible_emp IS TRUE
                         AND COALESCE(pm.option_emp, 99999) > 50 THEN '1E'
                         
                    -- 1D: MEC/MV + Spouse (and not Family)
                    WHEN pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_spouse IS TRUE
                         AND offer.is_eligible_family IS FALSE THEN '1D'
                         
                    -- 1C: MEC/MV + Child (and not Family/Spouse)
                    WHEN pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_child IS TRUE
                         AND offer.is_eligible_spouse IS FALSE
                         AND offer.is_eligible_family IS FALSE THEN '1C'
                         
                    -- 1B: MEC/MV + Emp Only (and not others)
                    WHEN pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_emp IS TRUE
                         AND offer.is_eligible_spouse IS FALSE
                         AND offer.is_eligible_child IS FALSE
                         AND offer.is_eligible_family IS FALSE THEN '1B'
                         
                    -- Fallback
                    ELSE '1H'
                END as initial_14_code,
                
                -- ==========================
                -- LINE 15 LOGIC (Cost)
                -- ==========================
                CASE
                    -- Blank if 1H (No Offer) or 1A (Qualifying Offer)
                    WHEN (offer.offer_of_coverage IS NULL OR offer.offer_of_coverage = false OR pm.me = 'N') THEN NULL
                    
                    -- Blank for 1A condition
                    WHEN (status.full_time_flag IS TRUE 
                         AND pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_family IS TRUE 
                         AND offer.is_eligible_emp IS TRUE
                         AND COALESCE(pm.option_emp, 99999) <= 50) THEN NULL
                    
                    -- Otherwise, show the lowest cost monthly premium for self-only coverage
                    ELSE pm.option_emp
                END as line_15_cost,
                
                -- ==========================
                -- LINE 16 LOGIC (Safe Harbor)
                -- ==========================
                CASE
                    -- 2A: Employee not employed during the month
                    WHEN status.employed_in_month = false THEN '2A'
                    
                    -- 2B: Employee not a full-time employee
                    WHEN status.full_time_flag = false AND (enroll.enrolled_in_coverage IS NULL OR enroll.enrolled_in_coverage = false) THEN '2B'
                    
                    -- 2C: Employee enrolled in coverage offered
                    WHEN enroll.enrolled_in_coverage = true THEN '2C'
                    
                    -- 2F: W-2 Safe Harbor (Only if Affordable - using $50 placeholder)
                    WHEN offer.offer_of_coverage = true AND pm.option_emp <= 50 THEN '2F'
                    
                    ELSE NULL
                END as line_16_code,
                
                -- Pass through for Override Logic
                enroll.enrolled_in_coverage,
                enroll.coverage_tier,
                pm_enroll.mvc as enrolled_plan_mvc,
                pm_enroll.me as enrolled_plan_me
                
            FROM aca_employee_monthly_status status
            LEFT JOIN aca_employee_monthly_offer offer 
                ON status.company_code = offer.company_code 
                AND status.employee_id = offer.employee_id 
                AND status.tax_year = offer.tax_year 
                AND status.month = offer.month
            -- FIX: Join Plan Master on BOTH Plan Code AND Company Code
            LEFT JOIN plan_master pm 
                ON pm.plan_code = offer.plan_code 
                AND pm.company_code = offer.company_code
            LEFT JOIN aca_employee_monthly_enrollment enroll 
                ON status.company_code = enroll.company_code 
                AND status.employee_id = enroll.employee_id 
                AND status.tax_year = enroll.tax_year 
                AND status.month = enroll.month
            -- FIX: Join Plan Master on BOTH Plan Code AND Company Code
            LEFT JOIN plan_master pm_enroll 
                ON pm_enroll.plan_code = enroll.plan_code
                AND pm_enroll.company_code = enroll.company_code
            WHERE status.company_code = p_company_code 
            AND status.tax_year = p_tax_year
            AND status.month = v_month
        )
        SELECT
            company_code,
            employee_id,
            tax_year,
            month,
            -- OVERRIDE LOGIC
            CASE
                WHEN initial_14_code IN ('1F', '1G', '1H') AND enrolled_in_coverage = true AND enrolled_plan_mvc = 'Y' AND enrolled_plan_me = 'Y' THEN
                    CASE
                        WHEN coverage_tier ILIKE '%01%' OR coverage_tier ILIKE '%EMP%' OR coverage_tier = 'Employee' THEN '1B'
                        WHEN coverage_tier ILIKE '%02%' OR coverage_tier ILIKE '%CHILD%' OR coverage_tier = 'Employee + Child' THEN '1C'
                        WHEN coverage_tier ILIKE '%03%' OR coverage_tier ILIKE '%SPOUSE%' OR coverage_tier = 'Employee + Spouse' THEN '1D'
                        ELSE initial_14_code
                    END
                ELSE initial_14_code
            END as line_14_code,
            line_15_cost,
            line_16_code
        FROM initial_calc;
        
        GET DIAGNOSTICS v_generated_count = ROW_COUNT;
        v_total_inserted := v_total_inserted + v_generated_count;
        
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'ACA final report generated successfully (Fixed Joins)',
        'total_rows', v_total_inserted,
        'company_code', p_company_code,
        'tax_year', p_tax_year
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Penalty Generation
CREATE OR REPLACE FUNCTION generate_aca_penalties(
    p_company_code VARCHAR,
    p_tax_year INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_penalty_a_rate NUMERIC := 241.67;
    v_penalty_b_rate NUMERIC := 362.50;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting generate_aca_penalties for Co: %, Year: %', p_company_code, p_tax_year;

    -- Clear existing penalties for this company/year
    DELETE FROM aca_penalty_report 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    RAISE NOTICE 'Cleared old penalties';
    
    -- Insert Penalties
    INSERT INTO aca_penalty_report (
        company_code, employee_id, tax_year, penalty_type, reason,
        jan_amount, feb_amount, mar_amount, apr_amount, may_amount, jun_amount,
        jul_amount, aug_amount, sep_amount, oct_amount, nov_amount, dec_amount,
        total_amount
    )
    SELECT
        company_code,
        employee_id,
        tax_year,
        penalty_type,
        CASE 
            WHEN penalty_type = 'A' THEN 'Penalty A: No MEC offered <br/> The employee was not offered minimum essential coverage (MEC) during the months in which the penalty was incurred.'
            ELSE 'Penalty B: Waived Unaffordable Coverage <br/> The employee was offered minimum essential coverage (MEC), but the lowest-cost option for employee-only coverage was not affordable, meaning it cost more than the $50 threshold. The employee chose to waive this unaffordable coverage.'
        END as reason,
        
        -- Calculate Monthly Amounts
        SUM(CASE WHEN month = 1 THEN amount ELSE 0 END) as jan,
        SUM(CASE WHEN month = 2 THEN amount ELSE 0 END) as feb,
        SUM(CASE WHEN month = 3 THEN amount ELSE 0 END) as mar,
        SUM(CASE WHEN month = 4 THEN amount ELSE 0 END) as apr,
        SUM(CASE WHEN month = 5 THEN amount ELSE 0 END) as may,
        SUM(CASE WHEN month = 6 THEN amount ELSE 0 END) as jun,
        SUM(CASE WHEN month = 7 THEN amount ELSE 0 END) as jul,
        SUM(CASE WHEN month = 8 THEN amount ELSE 0 END) as aug,
        SUM(CASE WHEN month = 9 THEN amount ELSE 0 END) as sep,
        SUM(CASE WHEN month = 10 THEN amount ELSE 0 END) as oct,
        SUM(CASE WHEN month = 11 THEN amount ELSE 0 END) as nov,
        SUM(CASE WHEN month = 12 THEN amount ELSE 0 END) as dec,
        
        SUM(amount) as total
        
    FROM (
        SELECT
            company_code,
            employee_id,
            tax_year,
            month,
            CASE
                -- Penalty A Logic: No Offer (1H) AND No Safe Harbor (Line 16 is NULL)
                WHEN line_14_code = '1H' AND line_16_code IS NULL THEN 'A'
                
                -- Penalty B Logic: Offer (Not 1H) AND Unaffordable (> 50) AND No Safe Harbor (Line 16 is NULL)
                -- Note: If Line 16 is 2F/2G/2H, it's safe. If 2C, enrolled. If NULL, potentially liable.
                WHEN line_14_code != '1H' AND COALESCE(line_15_cost, 0) > 50 AND line_16_code IS NULL THEN 'B'
                
                ELSE NULL
            END as penalty_type,
            CASE
                WHEN line_14_code = '1H' AND line_16_code IS NULL THEN v_penalty_a_rate
                WHEN line_14_code != '1H' AND COALESCE(line_15_cost, 0) > 50 AND line_16_code IS NULL THEN v_penalty_b_rate
                ELSE 0
            END as amount
        FROM aca_final_report
        WHERE company_code = p_company_code AND tax_year = p_tax_year
    ) monthly_data
    WHERE penalty_type IS NOT NULL
    GROUP BY company_code, employee_id, tax_year, penalty_type;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Generated % penalties', v_count;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Penalties generated successfully',
        'count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
