-- Add email column to employee_census
ALTER TABLE employee_census ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update upsert_employee_census function to include email
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
    p_email VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO employee_census (
        company_code, employee_id, first_name, middle_name, last_name, ssn,
        date_of_birth, gender, hire_date, termination_date, employment_status,
        job_title, department, full_time_equivalent, pay_frequency, employment_type_code,
        email, add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_employee_id, p_first_name, p_middle_name, p_last_name, p_ssn,
        p_date_of_birth, p_gender, p_hire_date, p_termination_date, p_employment_status,
        p_job_title, p_department, p_full_time_equivalent, p_pay_frequency, p_employment_type_code,
        p_email, p_add_name, p_add_date, NOW()
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
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'employee_id', p_employee_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
