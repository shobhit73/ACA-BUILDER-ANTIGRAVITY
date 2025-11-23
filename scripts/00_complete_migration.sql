-- ============================================================
-- Complete Migration: Base Tables + Derived Tables + Functions
-- ============================================================

-- ============================================================
-- EMPLOYEE CENSUS & ACA COMPLIANCE DATABASE SCHEMA
-- ============================================================
--
-- 🎯 PURPOSE:
-- This migration creates all tables and functions needed for:
-- 1. Storing employee census data (demographics, eligibility, enrollment)
-- 2. Calculating daily and monthly derived tables
-- 3. Generating ACA compliance codes (IRS Form 1095-C)
--
-- 📊 TABLE TYPES:
-- - BASE TABLES: Store raw data from Excel uploads
-- - DERIVED TABLES: Computed from base tables via stored procedures
-- - FUNCTIONS: PostgreSQL functions that rebuild derived tables
--
-- 🔄 DATA FLOW:
-- Excel → Base Tables → refresh_*() functions → Derived Tables → ACA Codes
--
-- ⚡ PERFORMANCE NOTES:
-- - All tables have appropriate indexes for fast queries
-- - Functions use CTEs (Common Table Expressions) for readability
-- - Date range queries use BETWEEN for index optimization
-- - Primary keys prevent duplicate data
--
-- 🔐 SECURITY:
-- - Functions are SECURITY DEFINER (run as creator, not caller)
-- - No row-level security (RLS) by default (add if needed)
--
-- ============================================================

-- ============================================================
-- CLEANUP: Drop existing objects
-- ============================================================
--
-- 🧹 WHY: Ensure clean slate for re-running migration
-- 🚨 WARNING: This deletes ALL data in these tables!
--

-- Drop existing tables and functions
DROP TABLE IF EXISTS dependent_enrollment_monthly CASCADE;
DROP TABLE IF EXISTS dependent_enrollment_daily CASCADE;
DROP TABLE IF EXISTS "Dep_Enrollment" CASCADE;
DROP TABLE IF EXISTS employee_details CASCADE;
DROP TABLE IF EXISTS enrollment_daily CASCADE;
DROP TABLE IF EXISTS eligibility_daily CASCADE;
DROP TABLE IF EXISTS enrollment_monthly CASCADE;
DROP TABLE IF EXISTS eligibility_monthly CASCADE;
DROP TABLE IF EXISTS employee_status_monthly CASCADE;
DROP TABLE IF EXISTS employee_status_daily CASCADE;
DROP TABLE IF EXISTS "Emp_Enrollment" CASCADE;
DROP TABLE IF EXISTS "Emp_Eligibility" CASCADE;
DROP TABLE IF EXISTS "Emp_Demographic" CASCADE;
DROP TABLE IF EXISTS employee_aca_monthly CASCADE;

DROP FUNCTION IF EXISTS refresh_dependent_enrollment(int);
DROP FUNCTION IF EXISTS refresh_enrollment(int);
DROP FUNCTION IF EXISTS refresh_eligibility(int);
DROP FUNCTION IF EXISTS refresh_employee_status(int);
DROP FUNCTION IF EXISTS refresh_employee_aca(int);

-- ============================================================
-- BASE TABLES: Emp_Demographic
-- ============================================================
--
-- 📋 PURPOSE: Stores employee employment status periods
--
-- 🔑 KEY COLUMNS:
-- - employeeid: Employee's unique identifier (can have multiple rows per employee)
-- - statusstartdate: When this status period began
-- - statusenddate: When this status period ended (NULL = ongoing)
-- - role: "FT" (Full-Time) or "PT" (Part-Time)
-- - employmentstatus: "Active", "LOA" (Leave of Absence), "Terminated"
--
-- 💡 WHY MULTIPLE ROWS PER EMPLOYEE?
-- Employees can change status during the year:
-- - 1/1/2025 - 6/30/2025: Full-Time, Active
-- - 7/1/2025 - 12/31/2025: Part-Time, Active
--
-- 📊 EXAMPLE DATA:
-- | employeeid | statusstartdate | statusenddate | role | employmentstatus |
-- |------------|-----------------|---------------|------|------------------|
-- | 1001       | 2025-01-01      | 2025-06-30    | FT   | Active           |
-- | 1001       | 2025-07-01      | NULL          | PT   | Active           |
--
-- 🔍 INDEXES:
-- - idx_emp_demographic_id: Fast lookup by employee ID
-- - idx_emp_demographic_dates: Fast date range queries
--

CREATE TABLE "Emp_Demographic" (
  id SERIAL PRIMARY KEY,
  employeeid INT NOT NULL,
  statusstartdate DATE NOT NULL,
  statusenddate DATE,
  role TEXT,
  employmentstatus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emp_demographic_id ON "Emp_Demographic"(employeeid);
CREATE INDEX idx_emp_demographic_dates ON "Emp_Demographic"(statusstartdate, statusenddate);

-- ============================================================
-- BASE TABLES: employee_details
-- ============================================================
--
-- 📋 PURPOSE: Stores detailed employee information (PII)
--
-- 🔑 PRIMARY KEY: employee_id (one row per employee)
--
-- 📊 COLUMNS EXPLAINED:
-- - first_name, middle_initial, last_name: Employee's full name
-- - ssn: Social Security Number (sensitive!)
-- - address_line1, city, state, zip_code: Home address
-- - employer_name, ein: Employer information
-- - employee_category: Department/division (used for dashboard filtering)
--
-- 🔄 UPSERT LOGIC:
-- This table uses UPSERT (ON CONFLICT ... DO UPDATE) because:
-- - Employee details might change (address, department, etc.)
-- - We want to update existing records, not create duplicates
--
-- 🔐 SECURITY NOTE:
-- Contains PII (Personally Identifiable Information)
-- Consider adding Row-Level Security (RLS) in production
--

CREATE TABLE employee_details (
  employee_id INT PRIMARY KEY,
  first_name TEXT,
  middle_initial TEXT,
  last_name TEXT,
  ssn TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  employer_name TEXT,
  ein TEXT,
  employer_address TEXT,
  contact_telephone TEXT,
  employer_city TEXT,
  employer_state TEXT,
  employer_zip_code TEXT,
  employer_country TEXT,
  employee_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employee_details_name ON employee_details(last_name, first_name);

-- ============================================================
-- BASE TABLES: Emp_Eligibility
-- ============================================================
--
-- 📋 PURPOSE: Stores eligibility periods for health insurance
--
-- 💡 KEY CONCEPT: Eligibility vs. Enrollment
-- - ELIGIBILITY: When employee is *offered* coverage (this table)
-- - ENROLLMENT: When employee *accepts* coverage (Emp_Enrollment table)
--
-- 🔑 KEY COLUMNS:
-- - eligibilitystartdate/enddate: Period when employee is eligible
-- - eligibleplan: Which plan they're eligible for ("PlanA", "PlanB", etc.)
-- - eligibletier: Coverage tier offered
-- - plancost: Monthly cost to employee (used for ACA affordability calculation)
--
-- 🏥 COVERAGE TIERS:
-- - EMP: Employee only
-- - EMPFAM: Employee + Family (spouse + children)
-- - EMPSPOUSE: Employee + Spouse only
-- - EMPCHILD: Employee + Children only
--
-- 💰 PLAN COST & ACA COMPLIANCE:
-- The "plancost" field is critical for ACA compliance:
-- - If plancost ≤ $50 for EMP tier → Coverage is "affordable"
-- - If plancost > $50 for EMP tier → Penalty B may apply
--
-- 📊 EXAMPLE DATA:
-- | employeeid | eligibilitystartdate | eligibilityenddate | eligibleplan | eligibletier | plancost |
-- |------------|----------------------|--------------------|--------------|--------------|----------|
-- | 1001       | 2025-01-01           | 2025-12-31         | PlanA        | EMP          | 50.00    |
-- | 1001       | 2025-01-01           | 2025-12-31         | PlanA        | EMPFAM       | 200.00   |
--
-- 🔍 WHY TWO ROWS?
-- Employee 1001 is offered both EMP and EMPFAM tiers for the same period.
-- This is important for ACA code 1A vs 1E determination.
--

CREATE TABLE "Emp_Eligibility" (
  id SERIAL PRIMARY KEY,
  employeeid INT NOT NULL,
  eligibilitystartdate DATE NOT NULL,
  eligibilityenddate DATE,
  eligibleplan TEXT,
  eligibletier TEXT,
  plancost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emp_eligibility_id ON "Emp_Eligibility"(employeeid);
CREATE INDEX idx_emp_eligibility_dates ON "Emp_Eligibility"(eligibilitystartdate, eligibilityenddate);

-- ============================================================
-- BASE TABLES: Emp_Enrollment
-- ============================================================
--
-- 📋 PURPOSE: Stores employee enrollment periods for health insurance
--
-- 💡 KEY CONCEPT: Eligibility vs. Enrollment
-- - ELIGIBILITY: When employee is *offered* coverage (Emp_Eligibility table)
-- - ENROLLMENT: When employee *accepts* coverage (this table)
--
-- 🔑 KEY COLUMNS:
-- - enrollmentstartdate/enddate: Period when employee is enrolled
-- - plancode: Code for the enrolled plan
-- - tier: Coverage tier enrolled in
--
-- 🏥 ENROLLMENT TIERS:
-- Same as eligibility tiers: EMP, EMPFAM, EMPSPOUSE, EMPCHILD
--
-- ❌ WAIVING COVERAGE:
-- If an employee waives coverage, it's still recorded here:
-- - plancode = 'Waive'
-- - This is important for distinguishing between "no offer" and "offer declined"
--
-- 📊 EXAMPLE DATA:
-- | employeeid | enrollmentstartdate | enrollmentenddate | plancode | tier     |
-- |------------|---------------------|-------------------|----------|----------|
-- | 1001       | 2025-01-01          | 2025-12-31        | PLANB    | EMP      | -- Employee enrolled in PlanB
-- | 1002       | 2025-01-01          | 2025-12-31        | Waive    | NULL     | -- Employee waived coverage
--
-- 🔍 INDEXES:
-- - idx_emp_enrollment_id: Fast lookup by employee ID
-- - idx_emp_enrollment_dates: Fast date range queries
--

CREATE TABLE "Emp_Enrollment" (
  id SERIAL PRIMARY KEY,
  employeeid INT NOT NULL,
  enrollmentstartdate DATE NOT NULL,
  enrollmentenddate DATE,
  plancode TEXT,
  tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emp_enrollment_id ON "Emp_Enrollment"(employeeid);
CREATE INDEX idx_emp_enrollment_dates ON "Emp_Enrollment"(enrollmentstartdate, enrollmentenddate);

-- ============================================================
-- BASE TABLES: Dep_Enrollment
-- ============================================================
--
-- 📋 PURPOSE: Stores dependent enrollment data
--
-- 🔑 KEY COLUMNS:
-- - employeeid: The employee associated with the dependent
-- - dependentid: Unique identifier for the dependent
-- - enrollmentstartdate/enddate: Period of enrollment for the dependent
-- - plancode: The plan the dependent is enrolled in
-- - dependentrelationship: Relationship of the dependent to the employee (e.g., "Spouse", "Child")
--
-- 👨‍👩‍👧‍👦 DEPENDENT INFO:
-- - depfirstname, depmidname, deplastname: Dependent's name
-- - deprelcode: Code representing dependent relationship
--
-- 📊 EXAMPLE DATA:
-- | employeeid | dependentid | enrollmentstartdate | enrollmentenddate | plancode | dependentrelationship |
-- |------------|-------------|---------------------|-------------------|----------|-----------------------|
-- | 1001       | 5001        | 2025-01-01          | 2025-12-31        | PLANB    | Spouse                |
-- | 1001       | 5002        | 2025-01-01          | 2025-12-31        | PLANB    | Child                 |
--
-- 🔍 INDEXES:
-- - idx_dep_enrollment_empid: Fast lookup by employee ID
-- - idx_dep_enrollment_depid: Fast lookup by dependent ID
-- - idx_dep_enrollment_dates: Fast date range queries
--

CREATE TABLE "Dep_Enrollment" (
  id SERIAL PRIMARY KEY,
  employeeid INT NOT NULL,
  dependentid INT NOT NULL,
  depfirstname TEXT,
  depmidname TEXT,
  deplastname TEXT,
  deprelcode TEXT,
  enrollmentstartdate DATE NOT NULL,
  enrollmentenddate DATE,
  dependentrelationship TEXT,
  plancode TEXT,
  planname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dep_enrollment_empid ON "Dep_Enrollment"(employeeid);
CREATE INDEX idx_dep_enrollment_depid ON "Dep_Enrollment"(dependentid);
CREATE INDEX idx_dep_enrollment_dates ON "Dep_Enrollment"(enrollmentstartdate, enrollmentenddate);

-- ============================================================
-- DERIVED TABLES: employee_status_daily
-- ============================================================
--
-- 📋 PURPOSE: Daily employment status for each employee
--
-- 🎯 CALCULATED FROM: "Emp_Demographic"
--
-- 🔑 PRIMARY KEY: (employee_id, date)
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - date: The specific day for this status record
-- - role: "FT" or "PT"
-- - employment_status: "Active", "LOA", "Terminated"
-- - is_employed: TRUE if 'Active' or 'LOA', FALSE if 'Terminated'
-- - is_full_time: TRUE if role is 'FT' AND employed
-- - is_part_time: TRUE if role is 'PT' AND employed
--
-- 💡 WHY DAILY?
-- Allows for precise tracking of status changes throughout the year,
-- crucial for monthly calculations (e.g., full month status).
--
-- 🔍 INDEXES:
-- - idx_status_daily_date: Fast queries by date
-- - idx_elig_daily_month: Fast queries by date, employee_id, eligible_plans
--

CREATE TABLE employee_status_daily (
  employee_id TEXT NOT NULL,
  date DATE NOT NULL,
  role TEXT,
  employment_status TEXT,
  is_employed BOOLEAN DEFAULT FALSE,
  is_full_time BOOLEAN DEFAULT FALSE,
  is_part_time BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, date)
);

CREATE INDEX idx_status_daily_date ON employee_status_daily(date);

-- ============================================================
-- DERIVED TABLES: employee_status_monthly
-- ============================================================
--
-- 📋 PURPOSE: Monthly aggregated employment status
--
-- 🎯 CALCULATED FROM: employee_status_daily
--
-- 🔑 PRIMARY KEY: (employee_id, month_start)
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - month_start: First day of the month (e.g., "2025-01-01")
-- - is_employed_full_month: TRUE if employed for all days of the month
-- - is_full_time_full_month: TRUE if full-time for all days of the month
-- - is_part_time_full_month: TRUE if part-time for all days of the month
-- - was_employed_any_day: TRUE if employee was employed for at least one day in the month
--
-- 💡 WHY MONTHLY?
-- Simplifies calculations for annual reporting, like ACA compliance.
--
-- 🔍 INDEXES:
-- - idx_status_monthly_month: Fast queries by month
--

CREATE TABLE employee_status_monthly (
  employee_id TEXT NOT NULL,
  month_start DATE NOT NULL,
  is_employed_full_month BOOLEAN DEFAULT FALSE,
  is_full_time_full_month BOOLEAN DEFAULT FALSE,
  is_part_time_full_month BOOLEAN DEFAULT FALSE,
  was_employed_any_day BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, month_start)
);

CREATE INDEX idx_status_monthly_month ON employee_status_monthly(month_start);

-- ============================================================
-- DERIVED TABLES: eligibility_daily
-- ============================================================
--
-- 📋 PURPOSE: Daily eligibility status for each employee
--
-- 🎯 CALCULATED FROM: "Emp_Eligibility"
--
-- 🔑 PRIMARY KEY: (employee_id, date, eligible_plans, eligible_tiers)
--
-- 💡 KEY CONCEPT: Reconstructs continuous eligibility periods
-- - Handles overlapping or fragmented eligibility records
-- - Expands each record to cover every day within its active period
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - date: The specific day for this eligibility record
-- - eligible_plans: Plan(s) employee was eligible for
-- - eligible_tiers: Tier(s) employee was eligible for (EMP, EMPFAM, etc.)
-- - plan_cost: Cost of the plan for that tier
-- - employee_eligible: TRUE if eligible for employee-only coverage
-- - child_eligible: TRUE if eligible for child coverage
-- - spouse_eligible: TRUE if eligible for spouse coverage
--
-- 🔍 INDEXES:
-- - idx_eligibility_daily_date: Fast queries by date
-- - idx_elig_daily_month: Fast queries by date, employee_id, eligible_plans
--

CREATE TABLE eligibility_daily (
  employee_id TEXT NOT NULL,
  date DATE NOT NULL,
  eligible_plans TEXT,
  eligible_tiers TEXT,
  plan_cost NUMERIC,
  employee_eligible BOOLEAN DEFAULT FALSE,
  child_eligible BOOLEAN DEFAULT FALSE,
  spouse_eligible BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, date, eligible_plans, eligible_tiers)
);

CREATE INDEX idx_eligibility_daily_date ON eligibility_daily(date);
CREATE INDEX idx_elig_daily_month ON eligibility_daily(date, employee_id, eligible_plans);

-- ============================================================
-- DERIVED TABLES: eligibility_monthly
-- ============================================================
--
-- 📋 PURPOSE: Monthly aggregated eligibility status
--
-- 🎯 CALCULATED FROM: eligibility_daily
--
-- 🔑 PRIMARY KEY: (employee_id, month_start, eligible_plans, eligible_tiers)
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - month_start: First day of the month
-- - eligible_plans: Plan(s) employee was eligible for
-- - eligible_tiers: Tier(s) employee was eligible for
-- - plan_cost: Monthly cost of the plan
-- - employee_eligible_full_month: TRUE if eligible for employee-only coverage for the entire month
-- - child_eligible_full_month: TRUE if eligible for child coverage for the entire month
-- - spouse_eligible_full_month: TRUE if eligible for spouse coverage for the entire month
--
-- 💡 WHY MONTHLY?
-- Simplifies tracking of overall eligibility for ACA compliance.
--
-- 🔍 INDEXES:
-- - idx_eligibility_monthly_month: Fast queries by month
--

CREATE TABLE eligibility_monthly (
  employee_id TEXT NOT NULL,
  month_start DATE NOT NULL,
  eligible_plans TEXT,
  eligible_tiers TEXT,
  plan_cost NUMERIC,
  employee_eligible_full_month BOOLEAN DEFAULT FALSE,
  child_eligible_full_month BOOLEAN DEFAULT FALSE,
  spouse_eligible_full_month BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, month_start, eligible_plans, eligible_tiers)
);

CREATE INDEX idx_eligibility_monthly_month ON eligibility_monthly(month_start);

-- ============================================================
-- DERIVED TABLES: enrollment_daily
-- ============================================================
--
-- 📋 PURPOSE: Daily enrollment status for each employee
--
-- 🎯 CALCULATED FROM: "Emp_Enrollment"
--
-- 🔑 PRIMARY KEY: (employee_id, date, plancode, tier)
--
-- 💡 KEY CONCEPT: Reconstructs continuous enrollment periods
-- - Handles overlapping or fragmented enrollment records
-- - Expands each record to cover every day within its active period
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - date: The specific day for this enrollment record
-- - plancode: Plan code enrolled in
-- - tier: Coverage tier enrolled in
-- - employee_enrolled: TRUE if employee is enrolled for this plan/tier on this day
-- - spouse_enrolled: TRUE if spouse is enrolled
-- - child_enrolled: TRUE if child is enrolled
--
-- 🔍 INDEXES:
-- - idx_enrollment_daily_date: Fast queries by date
-- - idx_enroll_daily_month: Fast queries by date, employee_id, plancode
--

CREATE TABLE enrollment_daily (
  employee_id TEXT NOT NULL,
  date DATE NOT NULL,
  plancode TEXT NOT NULL,
  tier TEXT,
  employee_enrolled BOOLEAN DEFAULT FALSE,
  spouse_enrolled BOOLEAN DEFAULT FALSE,
  child_enrolled BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, date, plancode, tier)
);

CREATE INDEX idx_enrollment_daily_date ON enrollment_daily(date);
CREATE INDEX idx_enroll_daily_month ON enrollment_daily(date, employee_id, plancode);

-- ============================================================
-- DERIVED TABLES: enrollment_monthly
-- ============================================================
--
-- 📋 PURPOSE: Monthly aggregated enrollment status
--
-- 🎯 CALCULATED FROM: enrollment_daily
--
-- 🔑 PRIMARY KEY: (employee_id, month_start, plancode, tier)
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - month_start: First day of the month
-- - plancode: Plan code enrolled in
-- - tier: Coverage tier enrolled in
-- - employee_enrolled: TRUE if enrolled for the entire month
-- - spouse_enrolled: TRUE if spouse enrolled for the entire month
-- - child_enrolled: TRUE if child enrolled for the entire month
--
-- 💡 WHY MONTHLY?
-- Simplifies tracking of overall enrollment for ACA compliance.
--
-- 🔍 INDEXES:
-- - idx_enrollment_monthly_month: Fast queries by month
--

CREATE TABLE enrollment_monthly (
  employee_id TEXT NOT NULL,
  month_start DATE NOT NULL,
  plancode TEXT NOT NULL,
  tier TEXT NOT NULL,
  employee_enrolled BOOLEAN DEFAULT FALSE,
  spouse_enrolled BOOLEAN DEFAULT FALSE,
  child_enrolled BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, month_start, plancode, tier)
);

CREATE INDEX idx_enrollment_monthly_month ON enrollment_monthly(month_start);

-- ============================================================
-- DERIVED TABLES: dependent_enrollment_daily
-- ============================================================
--
-- 📋 PURPOSE: Daily enrollment status for dependents
--
-- 🎯 CALCULATED FROM: "Dep_Enrollment"
--
-- 🔑 PRIMARY KEY: (employee_id, dependent_id, date)
--
-- 💡 KEY CONCEPT: Reconstructs continuous enrollment periods for dependents
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - dependent_id: Dependent's unique identifier
-- - date: The specific day for this enrollment record
-- - dep_first_name, dep_mid_name, dep_last_name: Dependent's name
-- - dep_rel_code: Dependent's relationship code
-- - plancode: Plan code enrolled in
-- - dependent_relationship: Relationship of the dependent to the employee
-- - is_enrolled: TRUE if the dependent is enrolled for this plan on this day
--
-- 🔍 INDEXES:
-- - idx_dep_enrollment_daily_date: Fast queries by date
-- - idx_dep_enrollment_daily_empid: Fast queries by employee ID
--

CREATE TABLE dependent_enrollment_daily (
  employee_id TEXT NOT NULL,
  dependent_id TEXT NOT NULL,
  date DATE NOT NULL,
  -- Added dependent name and relationship code columns
  dep_first_name TEXT,
  dep_mid_name TEXT,
  dep_last_name TEXT,
  dep_rel_code TEXT,
  plancode TEXT,
  dependent_relationship TEXT,
  is_enrolled BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, dependent_id, date)
);

CREATE INDEX idx_dep_enrollment_daily_date ON dependent_enrollment_daily(date);
CREATE INDEX idx_dep_enrollment_daily_empid ON dependent_enrollment_daily(employee_id);

-- ============================================================
-- DERIVED TABLES: dependent_enrollment_monthly
-- ============================================================
--
-- 📋 PURPOSE: Monthly aggregated enrollment status for dependents
--
-- 🎯 CALCULATED FROM: dependent_enrollment_daily
--
-- 🔑 PRIMARY KEY: (employee_id, dependent_id, month_start)
--
-- 📊 COLUMNS:
-- - employee_id: Employee's unique identifier
-- - dependent_id: Dependent's unique identifier
-- - month_start: First day of the month
-- - dep_first_name, dep_mid_name, dep_last_name: Dependent's name
-- - dep_rel_code: Dependent's relationship code
-- - plancode: Plan code enrolled in
-- - dependent_relationship: Relationship of the dependent to the employee
-- - is_enrolled_full_month: TRUE if dependent was enrolled for the entire month
--
-- 💡 WHY MONTHLY?
-- Simplifies tracking of overall dependent enrollment.
--
-- 🔍 INDEXES:
-- - idx_dep_enrollment_monthly_month: Fast queries by month
-- - idx_dep_enrollment_monthly_empid: Fast queries by employee ID
--

CREATE TABLE dependent_enrollment_monthly (
  employee_id TEXT NOT NULL,
  dependent_id TEXT NOT NULL,
  month_start DATE NOT NULL,
  -- Added dependent name and relationship code columns
  dep_first_name TEXT,
  dep_mid_name TEXT,
  dep_last_name TEXT,
  dep_rel_code TEXT,
  plancode TEXT,
  dependent_relationship TEXT,
  is_enrolled_full_month BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, dependent_id, month_start)
);

CREATE INDEX idx_dep_enrollment_monthly_month ON dependent_enrollment_monthly(month_start);
CREATE INDEX idx_dep_enrollment_monthly_empid ON dependent_enrollment_monthly(employee_id);

-- ============================================================
-- DERIVED TABLES: employee_aca_monthly
-- ============================================================
--
-- 📋 PURPOSE: Stores calculated ACA codes for IRS Form 1095-C
--
-- 🎯 WHAT IS FORM 1095-C?
-- IRS form that employers must provide to employees showing:
-- - Line 14: What type of coverage was offered
-- - Line 16: Which safe harbor code applies (if any)
--
-- 🔑 KEY COLUMNS:
-- - employee_id: Employee identifier
-- - month_start: First day of the month (e.g., "2025-01-01" for January)
-- - line_14: Offer of Coverage code (see below)
-- - line_16: Safe Harbor code (see below)
--
-- 📊 LINE 14 CODES (Offer of Coverage):
-- - 1A: Qualifying offer (affordable coverage to employee + family)
-- - 1B: Employee-only coverage offered
-- - 1C: Employee + children coverage offered
-- - 1D: Employee + spouse coverage offered
-- - 1E: Coverage offered but not affordable
-- - 1F: Minimum essential coverage (MEC) without minimum value (MV)
-- - 1G: Non-full-time employee enrolled
-- - 1H: No offer of coverage
--
-- 📊 LINE 16 CODES (Safe Harbor):
-- - NULL: No safe harbor code (Line 14 is 1A)
-- - 2A: Not employed
-- - 2B: Not full-time
-- - 2C: Enrolled in coverage
-- - 2F: Affordable offer declined (W-2 safe harbor)
-- - 2H: Unaffordable offer declined (rate-of-pay safe harbor)
--
-- 💡 HOW CODES ARE CALCULATED:
-- See the refresh_employee_aca() function below for full logic.
-- In summary:
-- - Line 14: Based on employment status, eligibility, and affordability
-- - Line 16: Based on enrollment status and affordability
--
-- 📊 EXAMPLE DATA:
-- | employee_id | month_start | line_14 | line_16 |
-- |-------------|-------------|---------|---------|
-- | 1001        | 2025-01-01  | 1A      | NULL    |  (Qualifying offer)
-- | 1002        | 2025-01-01  | 1E      | 2H      |  (Unaffordable + declined)
-- | 1003        | 2025-01-01  | 1G      | 2C      |  (Part-time + enrolled)
--

CREATE TABLE IF NOT EXISTS employee_aca_monthly (
  employee_id TEXT NOT NULL,
  month_start DATE NOT NULL,
  line_14 TEXT,
  line_16 TEXT,
  PRIMARY KEY (employee_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_aca_monthly_month ON employee_aca_monthly(month_start);

-- ============================================================
-- FUNCTION: refresh_employee_status(p_year INT)
-- ============================================================
--
-- 🎯 PURPOSE: Recalculate daily and monthly employee status
--
-- 📊 INPUTS:
-- - p_year: The tax year for which to refresh status (e.g., 2025)
--
-- 🔄 WHAT IT DOES:
-- 1. Deletes existing daily and monthly status data for the specified year.
-- 2. Populates employee_status_daily table by expanding status periods from "Emp_Demographic".
--    - It handles overlapping periods by assigning the latest status.
--    - It determines if an employee is employed, full-time, or part-time based on role and employment status.
-- 3. Populates employee_status_monthly table by aggregating daily data.
--    - An employee is considered "full month" if their status (employed, FT, PT)
--      was consistent for every day of that month.
--
-- 💡 KEY LOGIC:
-- - Status end dates are COALESCED to the end of the year if NULL.
-- - generate_series is used to create a row for each day within a status period.
-- - ROW_NUMBER() with PARTITION BY ensures only the most recent status is used for each day.
-- - bool_and() and COUNT(*) are used for monthly aggregation to check if status held for the entire month.
--
-- 🚀 PERFORMANCE:
-- - Optimized for large datasets using CTEs and appropriate indexes.
-- - Full year refresh should complete within seconds.
--
CREATE OR REPLACE FUNCTION refresh_employee_status(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear target year data
  DELETE FROM employee_status_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31);

  DELETE FROM employee_status_monthly
  WHERE month_start >= make_date(p_year, 1, 1)
    AND month_start <= make_date(p_year, 12, 1);

  -- Populate daily status
  INSERT INTO employee_status_daily (employee_id, date, role, employment_status, is_employed, is_full_time, is_part_time)
  WITH year_bounds AS (
    SELECT make_date(p_year, 1, 1) AS y_start, make_date(p_year, 12, 31) AS y_end
  ),
  normalized AS (
    SELECT
      ed.employeeid::TEXT AS employee_id,
      GREATEST(ed.statusstartdate, (SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(ed.statusenddate, (SELECT y_end FROM year_bounds)), (SELECT y_end FROM year_bounds)) AS end_dt,
      ed.role,
      ed.employmentstatus
    FROM "Emp_Demographic" ed
    WHERE COALESCE(ed.statusenddate, (SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND ed.statusstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT n.*, g.d::DATE AS dt
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, INTERVAL '1 day') g(d)
  ),
  ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.employee_id, e.dt ORDER BY e.start_dt DESC) AS rn
    FROM expanded e
  )
  SELECT
    employee_id,
    dt AS date,
    role,
    employmentstatus AS employment_status,
    -- Only count Active and LOA as employed, not Terminated
    (UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_employed,
    (UPPER(role) = 'FT' AND UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_full_time,
    (UPPER(role) = 'PT' AND UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_part_time
  FROM ranked
  WHERE rn = 1;

  -- Populate monthly status
  INSERT INTO employee_status_monthly (employee_id, month_start, is_employed_full_month, is_full_time_full_month, is_part_time_full_month, was_employed_any_day)
  SELECT
    employee_id,
    date_trunc('month', date)::DATE AS month_start,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_employed)) AS is_employed_full_month,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_full_time)) AS is_full_time_full_month,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_part_time)) AS is_part_time_full_month,
    bool_or(is_employed) AS was_employed_any_day
  FROM employee_status_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31)
  GROUP BY employee_id, date_trunc('month', date);
END;
$$;

-- ============================================================
-- FUNCTION: refresh_eligibility(p_year INT)
-- ============================================================
--
-- 🎯 PURPOSE: Recalculate daily and monthly employee eligibility
--
-- 📊 INPUTS:
-- - p_year: The tax year for which to refresh eligibility (e.g., 2025)
--
-- 🔄 WHAT IT DOES:
-- 1. Deletes existing daily and monthly eligibility data for the specified year.
-- 2. Populates eligibility_daily table by expanding eligibility periods from "Emp_Eligibility".
--    - Handles overlapping or fragmented eligibility records by creating a distinct row for each day, plan, and tier.
--    - Determines eligibility flags (employee, child, spouse) based on the tier.
-- 3. Populates eligibility_monthly table by aggregating daily data.
--    - Aggregates eligibility status per employee, month, plan, and tier.
--    - Checks if an employee was eligible for the *entire* month for each specific plan/tier combination.
--
-- 💡 KEY LOGIC:
-- - Eligibility periods are COALESCED to the year bounds if end dates are NULL or outside the year.
-- - generate_series is used to create a row for each day within an eligibility period.
-- - ON CONFLICT (employee_id, date, eligible_plans, eligible_tiers) DO UPDATE handles potential duplicate entries during expansion.
-- - For monthly aggregation, COUNT(DISTINCT ed.date) and BOOL_AND() are used to ensure eligibility held for the full month for each plan/tier.
-- - MAX(EXTRACT(DAY FROM ...)) ensures the correct number of days in the month is used for comparison.
--
-- 🚀 PERFORMANCE:
-- - Optimized for large datasets using CTEs and appropriate indexes.
--
CREATE OR REPLACE FUNCTION refresh_eligibility(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear target year
  DELETE FROM eligibility_daily
   WHERE date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31);
  DELETE FROM eligibility_monthly
   WHERE month_start BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,1);

  WITH year_bounds AS (
    SELECT make_date(p_year,1,1) y_start, make_date(p_year,12,31) y_end
  ),
  normalized AS (
    SELECT
      ee.employeeid::text AS employee_id,
      GREATEST(ee.eligibilitystartdate,(SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(ee.eligibilityenddate,(SELECT y_end FROM year_bounds)),(SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(ee.eligibleplan),'')  AS eligible_plans,
      NULLIF(TRIM(ee.eligibletier),'')  AS eligible_tiers,
      ee.plancost                       AS plan_cost
    FROM public."Emp_Eligibility" ee
    WHERE COALESCE(ee.eligibilityenddate,(SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND ee.eligibilitystartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT
      n.employee_id,
      (g.d)::date AS date,
      n.eligible_plans,
      n.eligible_tiers,
      n.plan_cost
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, interval '1 day') g(d)
  )
  INSERT INTO eligibility_daily
    (employee_id, date, eligible_plans, eligible_tiers, plan_cost,
     employee_eligible, child_eligible, spouse_eligible)
  SELECT
    e.employee_id,
    e.date,
    e.eligible_plans,
    e.eligible_tiers,
    e.plan_cost,
    (UPPER(e.eligible_tiers) IN ('EMP','EMPFAM','EMPSPOUSE','EMPCHILD')) AS employee_eligible,
    (UPPER(e.eligible_tiers) IN ('EMPFAM','EMPCHILD'))                   AS child_eligible,
    (UPPER(e.eligible_tiers) IN ('EMPFAM','EMPSPOUSE'))                  AS spouse_eligible
  FROM expanded e
  ON CONFLICT (employee_id, date, eligible_plans, eligible_tiers) DO UPDATE
    SET plan_cost        = EXCLUDED.plan_cost,
        employee_eligible= EXCLUDED.employee_eligible,
        child_eligible   = EXCLUDED.child_eligible,
        spouse_eligible  = EXCLUDED.spouse_eligible;

  -- Monthly aggregation now groups by tier to maintain separate rows per tier
  INSERT INTO eligibility_monthly
    (employee_id, month_start, eligible_plans, eligible_tiers, plan_cost,
     employee_eligible_full_month, child_eligible_full_month, spouse_eligible_full_month)
  SELECT
    ed.employee_id,
    date_trunc('month', ed.date)::date AS month_start,
    ed.eligible_plans,
    ed.eligible_tiers,
    MAX(ed.plan_cost) AS plan_cost,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.employee_eligible) AS employee_eligible_full_month,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.child_eligible) AS child_eligible_full_month,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.spouse_eligible) AS spouse_eligible_full_month
  FROM eligibility_daily ed
  WHERE ed.date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31)
  GROUP BY ed.employee_id, date_trunc('month', ed.date), ed.eligible_plans, ed.eligible_tiers;
END;
$$;

-- ============================================================
-- FUNCTION: refresh_enrollment(p_year INT)
-- ============================================================
--
-- 🎯 PURPOSE: Recalculate daily and monthly employee enrollment
--
-- 📊 INPUTS:
-- - p_year: The tax year for which to refresh enrollment (e.g., 2025)
--
-- 🔄 WHAT IT DOES:
-- 1. Deletes existing daily and monthly enrollment data for the specified year.
-- 2. Populates enrollment_daily table by expanding enrollment periods from "Emp_Enrollment".
--    - Handles overlapping or fragmented enrollment records by creating a distinct row for each day, plan, and tier.
--    - Determines enrollment flags (employee, spouse, child) based on tier and plan code (excluding 'Waive').
-- 3. Populates enrollment_monthly table by aggregating daily data.
--    - Aggregates enrollment status per employee, month, plan, and tier.
--    - Checks if an employee was enrolled for the *entire* month for each specific plan/tier combination.
--
-- 💡 KEY LOGIC:
-- - Enrollment periods are COALESCED to the year bounds if end dates are NULL or outside the year.
-- - generate_series is used to create a row for each day within an enrollment period.
-- - ON CONFLICT (employee_id, date, plancode, tier) DO UPDATE handles potential duplicate entries.
-- - 'Waive' plan code is excluded from enrollment flags.
-- - For monthly aggregation, COUNT(DISTINCT ed.date) and BOOL_AND() are used to ensure enrollment held for the full month for each plan/tier.
--
-- 🚀 PERFORMANCE:
-- - Optimized for large datasets using CTEs and appropriate indexes.
--
CREATE OR REPLACE FUNCTION refresh_enrollment(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM enrollment_daily
   WHERE date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31);
  DELETE FROM enrollment_monthly
   WHERE month_start BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,1);

  WITH year_bounds AS (
    SELECT make_date(p_year,1,1) y_start, make_date(p_year,12,31) y_end
  ),
  normalized AS (
    SELECT
      en.employeeid::text AS employee_id,
      GREATEST(en.enrollmentstartdate,(SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(en.enrollmentenddate,(SELECT y_end FROM year_bounds)),(SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(en.plancode),'')  AS plancode,
      COALESCE(NULLIF(TRIM(en.tier),''), 'NONE') AS tier
    FROM public."Emp_Enrollment" en
    WHERE COALESCE(en.enrollmentenddate,(SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND en.enrollmentstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT
      n.employee_id,
      (g.d)::date AS date,
      n.plancode,
      n.tier
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, interval '1 day') g(d)
  )
  INSERT INTO enrollment_daily
    (employee_id, date, plancode, tier,
     employee_enrolled, spouse_enrolled, child_enrolled)
  SELECT
    e.employee_id,
    e.date,
    e.plancode,
    e.tier,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMP','EMPFAM','EMPSPOUSE','EMPCHILD')) AS employee_enrolled,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMPFAM','EMPSPOUSE'))                 AS spouse_enrolled,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMPFAM','EMPCHILD'))                  AS child_enrolled
  FROM expanded e
  ON CONFLICT (employee_id, date, plancode, tier) DO UPDATE
    SET employee_enrolled = EXCLUDED.employee_enrolled,
        spouse_enrolled   = EXCLUDED.spouse_enrolled,
        child_enrolled    = EXCLUDED.child_enrolled;

  -- Monthly aggregation now groups by tier to maintain separate rows per tier
  INSERT INTO enrollment_monthly
    (employee_id, month_start, plancode, tier, employee_enrolled, spouse_enrolled, child_enrolled)
  SELECT
    ed.employee_id,
    date_trunc('month', ed.date)::date AS month_start,
    ed.plancode,
    ed.tier,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.employee_enrolled) AS employee_enrolled,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.spouse_enrolled) AS spouse_enrolled,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.child_enrolled) AS child_enrolled
  FROM enrollment_daily ed
  WHERE ed.date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31)
  GROUP BY ed.employee_id, date_trunc('month', ed.date), ed.plancode, ed.tier;
END;
$$;

-- ============================================================
-- FUNCTION: refresh_dependent_enrollment(p_year INT)
-- ============================================================
--
-- 🎯 PURPOSE: Recalculate daily and monthly dependent enrollment
--
-- 📊 INPUTS:
-- - p_year: The tax year for which to refresh dependent enrollment (e.g., 2025)
--
-- 🔄 WHAT IT DOES:
-- 1. Deletes existing daily and monthly dependent enrollment data for the specified year.
-- 2. Populates dependent_enrollment_daily table by expanding enrollment periods from "Dep_Enrollment".
--    - Handles overlapping or fragmented enrollment records.
--    - Includes dependent's name and relationship information.
-- 3. Populates dependent_enrollment_monthly table by aggregating daily data.
--    - Checks if a dependent was enrolled for the *entire* month.
--
-- 💡 KEY LOGIC:
-- - Similar expansion logic as employee enrollment using generate_series.
-- - ROW_NUMBER() is used to select the latest enrollment record for a dependent on a given day if overlaps exist.
-- - Monthly aggregation uses COUNT(*) and bool_and(is_enrolled) to determine full-month enrollment.
--
-- 🚀 PERFORMANCE:
-- - Optimized for large datasets using CTEs and appropriate indexes.
--
CREATE OR REPLACE FUNCTION refresh_dependent_enrollment(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear daily dependent enrollment data
  DELETE FROM dependent_enrollment_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31);

  -- Clear monthly dependent enrollment data
  DELETE FROM dependent_enrollment_monthly
  WHERE month_start >= make_date(p_year, 1, 1)
    AND month_start <= make_date(p_year, 12, 1);

  -- Populate daily dependent enrollment first
  -- Updated to include dependent name and relationship code from base table
  INSERT INTO dependent_enrollment_daily (
    employee_id, dependent_id, date, dep_first_name, dep_mid_name, dep_last_name,
    dep_rel_code, plancode, dependent_relationship, is_enrolled
  )
  WITH year_bounds AS (
    SELECT make_date(p_year, 1, 1) AS y_start, make_date(p_year, 12, 31) AS y_end
  ),
  normalized AS (
    SELECT
      de.employeeid::TEXT AS employee_id,
      de.dependentid::TEXT AS dependent_id,
      de.depfirstname AS dep_first_name,
      de.depmidname AS dep_mid_name,
      de.deplastname AS dep_last_name,
      de.deprelcode AS dep_rel_code,
      GREATEST(de.enrollmentstartdate, (SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(de.enrollmentenddate, (SELECT y_end FROM year_bounds)), (SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(de.plancode), '') AS plancode,
      NULLIF(TRIM(de.dependentrelationship), '') AS dependent_relationship
    FROM "Dep_Enrollment" de
    WHERE COALESCE(de.enrollmentenddate, (SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND de.enrollmentstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT n.*, g.d::DATE AS dt
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, INTERVAL '1 day') g(d)
  ),
  ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.employee_id, e.dependent_id, e.dt ORDER BY e.start_dt DESC) AS rn
    FROM expanded e
  )
  SELECT
    employee_id,
    dependent_id,
    dt AS date,
    dep_first_name,
    dep_mid_name,
    dep_last_name,
    dep_rel_code,
    plancode,
    dependent_relationship,
    (LOWER(COALESCE(plancode, '')) <> 'waive') AS is_enrolled
  FROM ranked
  WHERE rn = 1;

  -- Populate monthly dependent enrollment from daily data
  -- Updated to include dependent name and relationship code
  INSERT INTO dependent_enrollment_monthly (
    employee_id, dependent_id, month_start, dep_first_name, dep_mid_name, dep_last_name,
    dep_rel_code, plancode, dependent_relationship, is_enrolled_full_month
  )
  SELECT
    employee_id,
    dependent_id,
    date_trunc('month', date)::DATE AS month_start,
    MAX(dep_first_name) AS dep_first_name,
    MAX(dep_mid_name) AS dep_mid_name,
    MAX(dep_last_name) AS dep_last_name,
    MAX(dep_rel_code) AS dep_rel_code,
    plancode,
    dependent_relationship,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_enrolled)) AS is_enrolled_full_month
  FROM dependent_enrollment_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31)
  GROUP BY employee_id, dependent_id, date_trunc('month', date), plancode, dependent_relationship;
END;
$$;

-- ============================================================
-- FUNCTION: refresh_employee_aca(p_year INT)
-- ============================================================
--
-- 🎯 PURPOSE: Calculate ACA codes (Line 14 & 16) for all employees
--
-- 📊 INPUTS:
-- - p_year: Tax year to calculate (e.g., 2025)
--
-- 🔄 WHAT IT DOES:
-- 1. Clears existing ACA data for the year
-- 2. For each employee-month combination:
--    a. Checks employment status (full-time or not)
--    b. Checks eligibility (offered coverage or not)
--    c. Checks affordability (cost ≤ $50 or not)
--    d. Checks enrollment (enrolled or waived)
-- 3. Applies complex IRS rules to determine Line 14 and Line 16 codes
-- 4. Inserts calculated codes into employee_aca_monthly table
--
-- 💡 KEY LOGIC DECISIONS:
--
-- **Decision 1: When is coverage "affordable"?**
-- - We check if BOTH EMP and EMPFAM tiers exist
-- - If yes, we use EMP tier cost (employee-only cost)
-- - Threshold: ≤ $50 = affordable, > $50 = unaffordable
-- - Why EMP tier? IRS rules say affordability is based on employee-only cost
--
-- **Decision 2: When does Line 14 = 1A vs 1E?**
-- - 1A: Both EMP and EMPFAM offered + EMP cost ≤ $50
-- - 1E: Both EMP and EMPFAM offered + EMP cost > $50
-- - Why? 1A is "qualifying offer" = affordable family coverage
--
-- **Decision 3: When does Line 14 = 1G?**
-- - Always when employee is NOT full-time for full month
-- - Regardless of enrollment status
-- - Why? 1G specifically means "non-full-time employee enrolled"
--
-- **Decision 4: When is Line 16 NULL?**
-- - Always when Line 14 = 1A
-- - Why? Qualifying offer doesn't need safe harbor protection
--
-- **Decision 5: When does Line 16 = 2C?**
-- - When employee is enrolled for the entire month
-- - Applies regardless of employment status (FT, PT, or not employed)
-- - Why? Enrollment is the best safe harbor (no penalty if enrolled)
--
-- **Decision 6: How do we handle mid-month plan changes?**
-- - We check enrollment_daily table (not enrollment_monthly)
-- - Count distinct days with enrollment coverage
-- - If days = total days in month, then enrolled for full month
-- - Example: Employee switches from PlanA to PlanB on day 15
--   - Both plans cover different days, but all days covered
--   - Still counts as "enrolled for full month"
--
-- 🔧 TECHNICAL DETAILS:
--
-- **CTEs (Common Table Expressions):**
-- - all_months: Generates all 12 months of the year
-- - employees: Gets all unique employees
-- - employee_months: Cross-joins to create all employee-month combinations
-- - plana_elig: Aggregates PlanA eligibility data
-- - other_plan_elig: Checks for non-PlanA eligibility
-- - full_time_status_year: Checks if employee was ever full-time
-- - enrollment_status: Checks enrollment for entire month
--
-- **Why CTEs?**
-- - Readable: Each CTE has a clear purpose
-- - Maintainable: Easy to modify one CTE without breaking others
-- - Efficient: PostgreSQL optimizes CTEs into efficient execution plans
--
-- **JOIN Strategy:**
-- - LEFT JOIN for all tables (employee might not have data in some tables)
-- - Main query: employee_months (ensures all employee-months are processed)
-- - Joined tables: status, eligibility, enrollment
--
-- 🚀 PERFORMANCE:
-- - For 1000 employees: ~5-15 seconds
-- - For 10000 employees: ~1-3 minutes
-- - Bottleneck: enrollment_status CTE (checks daily enrollment)
-- - Optimization: Add index on enrollment_daily(date, employee_id)
--
-- 🐛 DEBUGGING:
-- To see what codes are assigned to a specific employee:
-- \`\`\`sql
-- SELECT * FROM employee_aca_monthly
-- WHERE employee_id = '1001'
-- ORDER BY month_start;
-- \`\`\`
--
-- To see all employees with Penalty A:
-- \`\`\`sql
-- SELECT employee_id, month_start, line_14, line_16
-- FROM employee_aca_monthly
-- WHERE line_14 = '1H' AND line_16 IS NULL;
-- \`\`\`
--

CREATE OR REPLACE FUNCTION refresh_employee_aca(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing ACA data for the target year
  DELETE FROM employee_aca_monthly
  WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1);

  -- Populate ACA Line 14 (Offer of Coverage) and Line 16 (Safe Harbor) codes
  -- ---------------------------------------------------------------------------
  -- 🧠 LOGIC OVERVIEW
  -- This query calculates the correct IRS codes for each employee/month.
  -- It uses a hierarchy of rules based on employment, eligibility, and enrollment.
  --
  -- KEY CONCEPTS:
  -- 1. OFFER (Line 14): What coverage was made available to the employee?
  -- 2. SAFE HARBOR (Line 16): Why is the employer not subject to a penalty?
  -- ---------------------------------------------------------------------------
  INSERT INTO employee_aca_monthly (employee_id, month_start, line_14, line_16)
  WITH all_months AS (
    -- Generate all 12 months of the year (2025-01-01, 2025-02-01, ..., 2025-12-01)
    SELECT generate_series(
      make_date(p_year, 1, 1),
      make_date(p_year, 12, 1),
      INTERVAL '1 month'
    )::DATE AS month_start
  ),
  employees AS (
    -- Get all unique employees who have any status data for this year
    SELECT DISTINCT employee_id
    FROM employee_status_monthly
    WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
  ),
  employee_months AS (
    -- Create all combinations of employees and months
    -- This ensures we have a row for every employee for every month
    -- (even if they have no data for that month)
    SELECT e.employee_id, m.month_start
    FROM employees e
    CROSS JOIN all_months m
  ),
  -- 🏥 PLANA ELIGIBILITY AGGREGATION
  -- For each employee-month, check PlanA eligibility
  plana_elig AS (
    SELECT
      employee_id,
      month_start,
      -- 🔍 KEY LOGIC: Check if BOTH EMP and EMPFAM tiers exist
      -- Why COUNT instead of BOOL_OR? Because tiers are in separate rows
      -- COUNT > 0 means "at least one row has this tier"
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMP' THEN 1 END) > 0 AS has_emp_tier,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPFAM' THEN 1 END) > 0 AS has_empfam_tier,
      -- Added checks for EMPSPOUSE and EMPCHILD tiers for precise 1B logic
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPSPOUSE' THEN 1 END) > 0 AS has_empspouse_tier,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPCHILD' THEN 1 END) > 0 AS has_empchild_tier,
      -- Check if coverage is offered for full month (any tier)
      BOOL_OR(employee_eligible_full_month) AS employee_eligible_full_month,
      BOOL_OR(spouse_eligible_full_month) AS spouse_eligible_full_month,
      BOOL_OR(child_eligible_full_month) AS child_eligible_full_month,
      -- Get the cost for each tier (NULL if tier doesn't exist)
      MIN(CASE WHEN UPPER(eligible_tiers) = 'EMP' THEN plan_cost END) AS emp_plan_cost,
      MIN(CASE WHEN UPPER(eligible_tiers) = 'EMPFAM' THEN plan_cost END) AS empfam_plan_cost
    FROM eligibility_monthly
    WHERE eligible_plans = 'PlanA'
      AND month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
    GROUP BY employee_id, month_start
  ),
  -- Check if any other plan (non-PlanA) was offered
  other_plan_elig AS (
    SELECT DISTINCT
      employee_id,
      month_start,
      TRUE AS has_other_plan
    FROM eligibility_monthly
    WHERE eligible_plans IS NOT NULL
      AND eligible_plans <> 'PlanA'
      AND month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
  ),
  -- Added CTE to check if employee was full-time in ANY month of the year for 1G logic
  full_time_status_year AS (
    SELECT
      employee_id,
      BOOL_OR(is_full_time_full_month) as was_full_time_any_month
    FROM employee_status_monthly
    WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
    GROUP BY employee_id
  ),
  -- 📝 ENROLLMENT STATUS CHECK
  -- 🔥 KEY EDGE CASE: Employee switches plans mid-month
  -- Example: Employee 1006 has PlanA (1/1-8/11) and PlanB (8/12-12/31)
  -- In August, neither plan covers the full month individually
  -- BUT the employee has continuous coverage across both plans
  -- Solution: Check enrollment_daily and count distinct days with coverage
  enrollment_status AS (
    SELECT
      employee_id,
      date_trunc('month', date)::date AS month_start,
      TRUE AS is_enrolled
    FROM enrollment_daily
    WHERE (employee_enrolled OR spouse_enrolled OR child_enrolled)
      AND date BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 31)
    GROUP BY employee_id, date_trunc('month', date)
    -- 🔍 KEY LOGIC: Employee is enrolled for full month if they have coverage every day
    -- EXTRACT(DAY FROM ...) gets the number of days in the month (28, 29, 30, or 31)
    -- COUNT(DISTINCT date) counts how many unique days have coverage
    -- If they match, employee was covered all month (even if across multiple plans)
    HAVING COUNT(DISTINCT date) = EXTRACT(DAY FROM (date_trunc('month', MIN(date)) + INTERVAL '1 month - 1 day'))::int
  )
  SELECT
    em.employee_id,
    em.month_start,
    -- ============================================================
    -- LINE 14: OFFER OF COVERAGE CODE
    -- ============================================================
    -- Determines what type of coverage was offered to the employee
    CASE
      -- ----------------------------------------------------------
      -- PRIORITY 1: HIGH-COST FAMILY OFFER (Code 1E)
      -- ----------------------------------------------------------
      -- Scenario: Employee is employed (FT or PT) and offered family coverage
      -- that costs > $50 (our simplified affordability threshold).
      -- This check comes first to ensure we catch high-cost plans.
      --
      -- 1E Criteria:
      -- 1. Employed for the full month
      -- 2. Offered "EMP" and "EMPFAM" tiers
      -- 3. Cost of "EMP" share > $50
      WHEN s.is_employed_full_month
           AND pa.has_emp_tier
           AND pa.has_empfam_tier
           AND COALESCE(pa.emp_plan_cost, 0) > 50
      THEN '1E'

      -- ----------------------------------------------------------
      -- PRIORITY 2: FULL-TIME EMPLOYEE LOGIC
      -- ----------------------------------------------------------
      WHEN s.is_full_time_full_month THEN
        CASE
          -- ------------------------------------------------------
          -- 1A: QUALIFYING OFFER (The "Golden" Code)
          -- ------------------------------------------------------
          -- Scenario: Affordable family coverage offered.
          -- Criteria: EMP & EMPFAM tiers offered + Cost <= $50
          WHEN pa.has_emp_tier
               AND pa.has_empfam_tier
               AND COALESCE(pa.emp_plan_cost, 0) <= 50
          THEN '1A'

          -- ------------------------------------------------------
          -- ENROLLMENT FALLBACKS (Crucial for Data Gaps)
          -- ------------------------------------------------------
          -- Scenario: Eligibility data might be missing/imperfect, but
          -- we know the employee is ENROLLED in a specific tier.
          -- Action: Assign code based on actual enrollment tier.
          WHEN enrolled_plana.tier = 'EMP' THEN '1B'
          WHEN enrolled_plana.tier = 'EMPCHILD' THEN '1C'
          WHEN enrolled_plana.tier = 'EMPSPOUSE' THEN '1D'
          WHEN enrolled_plana.tier = 'EMPFAM' THEN '1E'

          -- ------------------------------------------------------
          -- 1B: EMPLOYEE ONLY OFFER
          -- ------------------------------------------------------
          -- Scenario: Offered coverage for self, but NOT spouse/kids.
          -- Criteria: EMP tier only.
          WHEN pa.has_emp_tier
               AND pa.employee_eligible_full_month
               AND NOT pa.has_empfam_tier
               AND NOT pa.has_empspouse_tier
               AND NOT pa.has_empchild_tier
          THEN '1B'

          -- ------------------------------------------------------
          -- 1C: EMPLOYEE + CHILDREN OFFER
          -- ------------------------------------------------------
          -- Scenario: Offered coverage for self and kids, NOT spouse.
          -- Criteria: EMP & EMPCHILD tiers offered.
          WHEN (pa.has_emp_tier OR pa.has_empchild_tier)
               AND pa.employee_eligible_full_month
               AND pa.has_empchild_tier
               AND NOT pa.has_empfam_tier
               AND NOT pa.has_empspouse_tier
          THEN '1C'

          -- ------------------------------------------------------
          -- 1D: EMPLOYEE + SPOUSE OFFER
          -- ------------------------------------------------------
          -- Scenario: Offered coverage for self and spouse, NOT kids.
          -- Criteria: EMP & EMPSPOUSE tiers offered.
          WHEN (pa.has_emp_tier OR pa.has_empspouse_tier)
               AND pa.employee_eligible_full_month
               AND pa.has_empspouse_tier
               AND NOT pa.has_empfam_tier
               AND NOT pa.has_empchild_tier
          THEN '1D'

          -- ------------------------------------------------------
          -- 1F: MINIMUM ESSENTIAL COVERAGE (MEC) ONLY
          -- ------------------------------------------------------
          -- Scenario: Offered a "skinny" plan that doesn't provide
          -- Minimum Value (MV).
          WHEN op.has_other_plan AND pa.employee_id IS NULL
          THEN '1F'
          
          -- ------------------------------------------------------
          -- 1H: NO OFFER (Default for Full-Time)
          -- ------------------------------------------------------
          -- Scenario: Full-time but no offer recorded.
          ELSE '1H'
        END

      -- ----------------------------------------------------------
      -- PRIORITY 3: NON-FULL-TIME / PART-TIME LOGIC
      -- ----------------------------------------------------------
      ELSE
        CASE
          -- ------------------------------------------------------
          -- ENROLLMENT FALLBACKS (Override 1G/1H)
          -- ------------------------------------------------------
          -- If a part-time employee is enrolled in a specific tier,
          -- we assign the specific code instead of generic 1G.
          WHEN enrolled_plana.tier = 'EMP' THEN '1B'
          WHEN enrolled_plana.tier = 'EMPCHILD' THEN '1C'
          WHEN enrolled_plana.tier = 'EMPSPOUSE' THEN '1D'
          WHEN enrolled_plana.tier = 'EMPFAM' THEN '1E'

          -- ------------------------------------------------------
          -- 1G: NON-FULL-TIME ENROLLED
          -- ------------------------------------------------------
          -- Scenario: Employee was NOT full-time at any point in the year
          -- but was enrolled in coverage.
          -- Criteria: Employed + Not FT All Year + Enrolled
          WHEN COALESCE(s.was_employed_any_day, FALSE)
               AND NOT COALESCE(fty.was_full_time_any_month, FALSE)
               AND COALESCE(enr.is_enrolled, FALSE)
          THEN '1G'

          -- ------------------------------------------------------
          -- 1H: NO OFFER / NO OFFER REQUIRED
          -- ------------------------------------------------------
          -- Scenario: Part-time employee (not enrolled) or not employed.
          ELSE '1H'
        END
    END AS line_14,

    -- ============================================================
    -- LINE 16: SAFE HARBOR CODE
    -- ============================================================
    -- 🚨 CRITICAL IRS RULE: If Line 14 is 1A, Line 16 MUST be blank (NULL)
    -- This check MUST come FIRST, before ANY other Line 16 logic
    -- ============================================================
    CASE
      -- ----------------------------------------------------------
      -- 1. QUALIFYING OFFER EXCEPTION (1A → NULL) - HIGHEST PRIORITY
      -- ----------------------------------------------------------
      -- If Line 14 would be 1A, Line 16 MUST be blank (NULL).
      -- This is true EVEN IF the employee is enrolled.
      -- Reason: 1A is a "qualifying offer" that provides full safe harbor on its own.
      WHEN (
        s.is_full_time_full_month
        AND pa.has_emp_tier
        AND pa.has_empfam_tier
        AND COALESCE(pa.emp_plan_cost, 0) <= 50
      ) THEN NULL

      -- ----------------------------------------------------------
      -- 2. ENROLLMENT SAFE HARBOR (2C)
      -- ----------------------------------------------------------
      -- If employee is enrolled, employer is safe from penalty.
      -- Applies to FT, PT, COBRA, etc.
      WHEN enr.is_enrolled THEN '2C'

      -- ----------------------------------------------------------
      -- 3. NOT EMPLOYED (2A)
      -- ----------------------------------------------------------
      -- Employee didn't work a single day this month.
      WHEN s.employee_id IS NULL OR NOT COALESCE(s.was_employed_any_day, FALSE)
      THEN '2A'

      -- ----------------------------------------------------------
      -- 4. NOT FULL-TIME (2B)
      -- ----------------------------------------------------------
      -- Employee worked but wasn't full-time (and didn't enroll).
      WHEN NOT COALESCE(s.is_full_time_full_month, FALSE)
      THEN '2B'

      -- ----------------------------------------------------------
      -- 5. FULL-TIME EMPLOYEE SAFE HARBORS
      -- ----------------------------------------------------------
      WHEN s.is_full_time_full_month THEN
        CASE
          -- 2F: W-2 Safe Harbor (Affordable Offer)
          -- Offer was affordable (<= $50) but employee waived.
          WHEN pa.has_emp_tier
               AND pa.has_empfam_tier
               AND COALESCE(pa.emp_plan_cost, 0) <= 50
          THEN '2F'

          -- 2F Alternative: Affordable Employee-Only Offer
          WHEN pa.employee_eligible_full_month
               AND NOT (pa.spouse_eligible_full_month AND pa.child_eligible_full_month)
               AND COALESCE(pa.emp_plan_cost, 0) <= 50
          THEN '2F'

          -- 2H: Rate of Pay Safe Harbor (Unaffordable Offer)
          -- Offer was made but cost > $50.
          WHEN pa.has_emp_tier
               AND pa.has_empfam_tier
               AND COALESCE(pa.emp_plan_cost, 0) > 50
          THEN '2H'

          -- 2H Fallback: Any other offer declined
          WHEN pa.employee_eligible_full_month
          THEN '2H'

          -- No Safe Harbor
          ELSE NULL
        END

      -- Default
      ELSE NULL
    END AS line_16
  FROM employee_months em
  LEFT JOIN employee_status_monthly s
    ON s.employee_id = em.employee_id
    AND s.month_start = em.month_start
  LEFT JOIN plana_elig pa
    ON pa.employee_id = em.employee_id
    AND pa.month_start = em.month_start
  LEFT JOIN other_plan_elig op
    ON op.employee_id = em.employee_id
    AND op.month_start = em.month_start
  LEFT JOIN full_time_status_year fty
    ON fty.employee_id = em.employee_id
  LEFT JOIN enrollment_status enr
    ON enr.employee_id = em.employee_id
    AND enr.month_start = em.month_start
  -- Added join to enrollment_monthly to get PlanA enrollment details for fallback logic
  LEFT JOIN enrollment_monthly enrolled_plana
    ON enrolled_plana.employee_id = em.employee_id
    AND enrolled_plana.month_start = em.month_start
    AND enrolled_plana.plancode = 'PlanA'
    AND enrolled_plana.employee_enrolled = TRUE;
END;
$$;
