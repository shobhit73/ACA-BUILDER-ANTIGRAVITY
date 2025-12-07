-- 001-core-schema.sql
-- Combined Schema Definition for ACA-1095 Builder
-- Consolidates previous scripts: 001, 013, 017, 115, 016 (Robust Logic)

-- ==========================================
-- 1. Core Company & User Tables
-- ==========================================

-- Company Details
CREATE TABLE IF NOT EXISTS company_details (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    dba_name VARCHAR(255),
    ein VARCHAR(20),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    
    -- ALE / ACA Specifics
    is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
    is_agg_ale_group BOOLEAN DEFAULT FALSE,
    cert_qualifying_offer BOOLEAN DEFAULT FALSE,
    cert_98_percent_offer BOOLEAN DEFAULT FALSE,
    
    -- Modules & Status (Enhanced)
    modules TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT CHECK (role IN ('system_admin', 'employer_admin', 'employee')) DEFAULT 'employee',
    company_code VARCHAR(50), -- Optional direct link for employees
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Company Mapping (Many-to-Many for Admins)
CREATE TABLE IF NOT EXISTS user_company_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_code VARCHAR REFERENCES public.company_details(company_code) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'company_admin',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_code)
);

-- ==========================================
-- 2. ACA Business Logic Tables
-- ==========================================

-- Plan Master
CREATE TABLE IF NOT EXISTS plan_master (
    company_code VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50),
    mvc BOOLEAN DEFAULT FALSE,
    me BOOLEAN DEFAULT FALSE,
    plan_affordable_cost NUMERIC(10, 2),
    
    -- Robust Logic Options
    option_emp NUMERIC(10, 2),
    option_emp_spouse NUMERIC(10, 2),
    option_emp_child NUMERIC(10, 2),
    option_emp_family NUMERIC(10, 2),
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_code, plan_code),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Employee Census
CREATE TABLE IF NOT EXISTS employee_census (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to Auth
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    ssn VARCHAR(20),
    email VARCHAR(255), -- Added from 012
    date_of_birth DATE,
    gender VARCHAR(10),
    hire_date DATE,
    termination_date DATE,
    employment_status VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(255),
    full_time_equivalent NUMERIC(5,2),
    pay_frequency VARCHAR(50),
    employment_type_code VARCHAR(50),
    
    -- Robust Logic
    employee_category VARCHAR(100),
    notes TEXT,
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Employee Address
CREATE TABLE IF NOT EXISTS employee_address (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    county VARCHAR(100),
    country VARCHAR(100),
    
    -- Robust Logic
    address_end_date DATE,
    notes TEXT,
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, effective_date)
);

-- Employee Waiting Period
CREATE TABLE IF NOT EXISTS employee_waiting_period (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    
    -- Robust Logic
    plan_code VARCHAR(50),
    effective_date DATE,
    waiting_period_end_date DATE,
    wait_period_days INTEGER,
    
    is_waiting_period_waived BOOLEAN DEFAULT FALSE,
    waiver_reason TEXT,
    
    category_code VARCHAR(50), 
    benefit_class VARCHAR(100),
    measurement_type VARCHAR(50),
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id), -- Warning: This PK might be restrictive if robust usage allows history? Robust Upsert has CONFLICT (company_code, employee_id). Implies 1 per emp.
    -- However, upsert_employee_waiting_period has ON CONFLICT (company_code, employee_id). So PK is correct for logic.
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

-- Employee Plan Eligibility
CREATE TABLE IF NOT EXISTS employee_plan_eligibility (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    eligibility_start_date DATE NOT NULL,
    eligibility_end_date DATE,
    eligibility_status VARCHAR(50),
    benefit_class VARCHAR(100),
    measurement_type VARCHAR(50),
    option_code VARCHAR(50),
    plan_cost NUMERIC(10, 2),
    
    -- Robust Logic
    category_code VARCHAR(50),
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    FOREIGN KEY (company_code, plan_code) REFERENCES plan_master(company_code, plan_code) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, plan_code, eligibility_start_date)
);

-- Employee Plan Enrollment
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
    enrollment_event VARCHAR(50),
    option_code VARCHAR(50),
    
    -- Robust Logic
    category_code VARCHAR(50),
    benefit_class VARCHAR(100),
    measurement_type VARCHAR(50),
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    FOREIGN KEY (company_code, plan_code) REFERENCES plan_master(company_code, plan_code) ON DELETE CASCADE
);

-- Employee Dependent
CREATE TABLE IF NOT EXISTS employee_dependent (
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    dependent_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    ssn VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    relationship VARCHAR(50),
    is_disabled BOOLEAN DEFAULT FALSE,
    
    enrollment_id VARCHAR(100), -- Robust Logic
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_code, employee_id, dependent_id),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

-- Plan Enrollment Cost
CREATE TABLE IF NOT EXISTS plan_enrollment_cost (
    id SERIAL PRIMARY KEY,
    enrollment_id VARCHAR(100) NOT NULL,
    cost_period_start DATE NOT NULL,
    cost_period_end DATE NOT NULL,
    employee_cost NUMERIC(10,2),
    employer_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    
    -- Robust Logic
    coverage_id VARCHAR(50),
    category_code VARCHAR(50),
    benefit_class VARCHAR(100),
    measurement_type VARCHAR(50),
    
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (enrollment_id) REFERENCES employee_plan_enrollment(enrollment_id) ON DELETE CASCADE,
    UNIQUE (enrollment_id, cost_period_start)
);

-- Payroll Hours
CREATE TABLE IF NOT EXISTS payroll_hours (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    hours_worked NUMERIC(10,2),
    regular_hours NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    gross_wages NUMERIC(15, 2),
    month INTEGER,
    add_name VARCHAR(255),
    add_date DATE,
    modified_by UUID,
    modified_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE,
    UNIQUE (company_code, employee_id, pay_period_start)
);

-- ==========================================
-- 3. Robust Schema Updates (Idempotent)
-- ==========================================
-- Ensure columns exist even if table was already created by an older script

-- Company Details
ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_agg_ale_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cert_qualifying_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cert_98_percent_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS company_code VARCHAR(50);

-- Plan Master
ALTER TABLE plan_master 
ADD COLUMN IF NOT EXISTS option_emp NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS option_emp_spouse NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS option_emp_child NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS option_emp_family NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Census
ALTER TABLE employee_census
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Address
ALTER TABLE employee_address
ADD COLUMN IF NOT EXISTS address_end_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Waiting Period
ALTER TABLE employee_waiting_period
ADD COLUMN IF NOT EXISTS plan_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50), 
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR(100),
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Plan Eligibility
ALTER TABLE employee_plan_eligibility
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Plan Enrollment
ALTER TABLE employee_plan_enrollment
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR(100),
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Employee Dependent
ALTER TABLE employee_dependent
ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Plan Enrollment Cost
ALTER TABLE plan_enrollment_cost
ADD COLUMN IF NOT EXISTS coverage_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS benefit_class VARCHAR(100),
ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();

-- Payroll Hours
ALTER TABLE payroll_hours
ADD COLUMN IF NOT EXISTS add_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS add_date DATE,
ADD COLUMN IF NOT EXISTS modified_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS modified_on TIMESTAMPTZ DEFAULT NOW();


-- ==========================================
-- 4. Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_employee_census_company ON employee_census(company_code);
CREATE INDEX IF NOT EXISTS idx_employee_census_user_id ON employee_census(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_address_employee ON employee_address(company_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_plan_eligibility_employee ON employee_plan_eligibility(company_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_plan_enrollment_employee ON employee_plan_enrollment(company_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_plan_enrollment_dates ON employee_plan_enrollment(effective_date, termination_date);
CREATE INDEX IF NOT EXISTS idx_dependent_employee ON employee_dependent(company_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_hours(company_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_dates ON payroll_hours(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_company_details_status ON company_details(is_active);
