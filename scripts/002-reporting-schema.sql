-- 002-reporting-schema.sql
-- Consolidated ACA Reporting Tables
-- Merges: 004, 009, 011 (Tables Only)

-- ====================================================================
-- 1. ACA INTERIM TABLES
-- ====================================================================

-- Table 1: Employee Monthly Status
-- Tracks employment status, hours of service, and FT determination per employee per month
CREATE TABLE IF NOT EXISTS aca_employee_monthly_status (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  month_start_date DATE NOT NULL,
  month_end_date DATE NOT NULL,
  employed_in_month BOOLEAN NOT NULL,
  hired_during_month BOOLEAN NOT NULL,
  terminated_during_month BOOLEAN NOT NULL,
  employment_status_end_of_month VARCHAR(50),
  waiting_period_month BOOLEAN NOT NULL DEFAULT FALSE,
  waiting_period_waived BOOLEAN NOT NULL DEFAULT FALSE,
  hours_of_service NUMERIC(10,2),
  full_time_flag BOOLEAN,
  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_status_emp ON aca_employee_monthly_status(company_code, employee_id, tax_year, month);

-- Table 2: Employee Monthly Offer
-- Tracks coverage offers made to employees per month for Line 14 determination
CREATE TABLE IF NOT EXISTS aca_employee_monthly_offer (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  offer_of_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  plan_code VARCHAR(50),
  eligible_for_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  eligibility_start_date DATE,
  eligibility_end_date DATE,
  coverage_tier_offered VARCHAR(50),
  
  -- Breakdown for Line 14 Logic
  is_eligible_emp BOOLEAN DEFAULT FALSE,
  is_eligible_spouse BOOLEAN DEFAULT FALSE,
  is_eligible_child BOOLEAN DEFAULT FALSE,
  is_eligible_family BOOLEAN DEFAULT FALSE,
  
  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_offer_emp ON aca_employee_monthly_offer(company_code, employee_id, tax_year, month);

-- Table 3: Employee Monthly Enrollment
-- Tracks actual enrollment and cost sharing per month for Line 15/16 determination
CREATE TABLE IF NOT EXISTS aca_employee_monthly_enrollment (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  enrolled_in_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  enrollment_id VARCHAR(100),
  plan_code VARCHAR(50),
  coverage_tier VARCHAR(50),
  employee_cost NUMERIC(10,2),
  employer_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  safe_harbor_code VARCHAR(10),
  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_enrollment_emp ON aca_employee_monthly_enrollment(company_code, employee_id, tax_year, month);

-- ====================================================================
-- 2. ACA FINAL REPORT
-- ====================================================================

CREATE TABLE IF NOT EXISTS aca_final_report (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    tax_year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    line_14_code VARCHAR(2),
    line_15_cost NUMERIC(10,2),
    line_16_code VARCHAR(2),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_code, employee_id, tax_year, month),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_final_report_lookup ON aca_final_report(company_code, tax_year, month);

-- ====================================================================
-- 3. ACA PENALTY REPORT
-- ====================================================================

CREATE TABLE IF NOT EXISTS aca_penalty_report (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    tax_year INTEGER NOT NULL,
    penalty_type VARCHAR(1) NOT NULL, -- 'A' or 'B'
    reason TEXT,
    jan_amount NUMERIC(10, 2) DEFAULT 0,
    feb_amount NUMERIC(10, 2) DEFAULT 0,
    mar_amount NUMERIC(10, 2) DEFAULT 0,
    apr_amount NUMERIC(10, 2) DEFAULT 0,
    may_amount NUMERIC(10, 2) DEFAULT 0,
    jun_amount NUMERIC(10, 2) DEFAULT 0,
    jul_amount NUMERIC(10, 2) DEFAULT 0,
    aug_amount NUMERIC(10, 2) DEFAULT 0,
    sep_amount NUMERIC(10, 2) DEFAULT 0,
    oct_amount NUMERIC(10, 2) DEFAULT 0,
    nov_amount NUMERIC(10, 2) DEFAULT 0,
    dec_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_code, employee_id, tax_year, penalty_type)
);
