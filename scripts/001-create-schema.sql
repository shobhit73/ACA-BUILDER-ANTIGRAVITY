-- Create Company Details Table
CREATE TABLE IF NOT EXISTS company_details (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    dba_name VARCHAR(255),
    ein VARCHAR(20),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Plan Master Table
CREATE TABLE IF NOT EXISTS plan_master (
    company_code VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50),
    coverage_type VARCHAR(50),
    is_ale_plan BOOLEAN DEFAULT FALSE,
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, plan_code),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Create Employee Census Table
CREATE TABLE IF NOT EXISTS employee_census (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    ssn VARCHAR(11),
    date_of_birth DATE,
    gender VARCHAR(10),
    hire_date DATE,
    termination_date DATE,
    employment_status VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(255),
    full_time_equivalent NUMERIC(5,2),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Create Employee Address Table
CREATE TABLE IF NOT EXISTS employee_address (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, effective_date)
);

-- Create Employee Waiting Period Table
CREATE TABLE IF NOT EXISTS employee_waiting_period (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    waiting_period_end_date DATE,
    is_waiting_period_waived BOOLEAN DEFAULT FALSE,
    waiver_reason TEXT,
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

-- Create Employee Plan Eligibility Table
CREATE TABLE IF NOT EXISTS employee_plan_eligibility (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    eligibility_start_date DATE NOT NULL,
    eligibility_end_date DATE,
    eligibility_status VARCHAR(50),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    FOREIGN KEY (company_code, plan_code) REFERENCES plan_master(company_code, plan_code) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, plan_code, eligibility_start_date)
);

-- Create Employee Plan Enrollment Table
CREATE TABLE IF NOT EXISTS employee_plan_enrollment (
    enrollment_id VARCHAR(100) PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    enrollment_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    termination_date DATE,
    coverage_tier VARCHAR(50),
    enrollment_status VARCHAR(50),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    FOREIGN KEY (company_code, plan_code) REFERENCES plan_master(company_code, plan_code) ON DELETE CASCADE
);

-- Create Employee Dependent Table
CREATE TABLE IF NOT EXISTS employee_dependent (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    dependent_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    ssn VARCHAR(11),
    date_of_birth DATE,
    gender VARCHAR(10),
    relationship VARCHAR(50),
    is_disabled BOOLEAN DEFAULT FALSE,
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id, dependent_id),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

-- Create Plan Enrollment Cost Table
CREATE TABLE IF NOT EXISTS plan_enrollment_cost (
    id SERIAL PRIMARY KEY,
    enrollment_id VARCHAR(100) NOT NULL,
    cost_period_start DATE NOT NULL,
    cost_period_end DATE NOT NULL,
    employee_cost NUMERIC(10,2),
    employer_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (enrollment_id) REFERENCES employee_plan_enrollment(enrollment_id) ON DELETE CASCADE,
    UNIQUE (enrollment_id, cost_period_start)
);

-- Create Payroll Hours Table
CREATE TABLE IF NOT EXISTS payroll_hours (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    hours_worked NUMERIC(10,2),
    regular_hours NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    add_name VARCHAR(255),
    add_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, pay_period_start)
);

-- Create indexes for better query performance
CREATE INDEX idx_employee_census_company ON employee_census(company_code);
CREATE INDEX idx_employee_address_employee ON employee_address(company_code, employee_id);
CREATE INDEX idx_plan_eligibility_employee ON employee_plan_eligibility(company_code, employee_id);
CREATE INDEX idx_plan_enrollment_employee ON employee_plan_enrollment(company_code, employee_id);
CREATE INDEX idx_plan_enrollment_dates ON employee_plan_enrollment(effective_date, termination_date);
CREATE INDEX idx_dependent_employee ON employee_dependent(company_code, employee_id);
CREATE INDEX idx_payroll_employee ON payroll_hours(company_code, employee_id);
CREATE INDEX idx_payroll_dates ON payroll_hours(pay_period_start, pay_period_end);
