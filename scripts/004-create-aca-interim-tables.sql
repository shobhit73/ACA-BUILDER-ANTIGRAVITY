-- ====================================================================
-- ACA INTERIM TABLES & GENERATION PROCEDURE
-- Purpose: Create monthly ACA calculation tables for Form 1095-C
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

  -- Employment presence
  employed_in_month BOOLEAN NOT NULL,
  hired_during_month BOOLEAN NOT NULL,
  terminated_during_month BOOLEAN NOT NULL,
  employment_status_end_of_month VARCHAR(50),

  -- Waiting period / LNAP (Limited Non-Assessment Period)
  waiting_period_month BOOLEAN NOT NULL DEFAULT FALSE,
  waiting_period_waived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Service & FT logic
  hours_of_service NUMERIC(10,2),
  full_time_flag BOOLEAN,

  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id)
    REFERENCES employee_census(company_code, employee_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_status_emp
  ON aca_employee_monthly_status(company_code, employee_id, tax_year, month);


-- Table 2: Employee Monthly Offer
-- Tracks coverage offers made to employees per month for Line 14 determination
CREATE TABLE IF NOT EXISTS aca_employee_monthly_offer (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Offer status
  offer_of_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  plan_code VARCHAR(50),
  
  -- Eligibility tracking
  eligible_for_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  eligibility_start_date DATE,
  eligibility_end_date DATE,

  -- Coverage tier offered
  coverage_tier_offered VARCHAR(50), -- 'Employee Only', 'Employee + Spouse', 'Employee + Children', 'Family'

  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id)
    REFERENCES employee_census(company_code, employee_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_offer_emp
  ON aca_employee_monthly_offer(company_code, employee_id, tax_year, month);


-- Table 3: Employee Monthly Enrollment
-- Tracks actual enrollment and cost sharing per month for Line 15/16 determination
CREATE TABLE IF NOT EXISTS aca_employee_monthly_enrollment (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Enrollment status
  enrolled_in_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  enrollment_id VARCHAR(100),
  plan_code VARCHAR(50),
  coverage_tier VARCHAR(50), -- Actual coverage tier

  -- Cost tracking for affordability
  employee_cost NUMERIC(10,2), -- Monthly employee contribution
  employer_cost NUMERIC(10,2), -- Monthly employer contribution
  total_cost NUMERIC(10,2),    -- Total monthly premium

  -- Safe harbor tracking
  safe_harbor_code VARCHAR(10), -- For future use in Line 16

  add_name VARCHAR(255),
  add_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_code, employee_id, tax_year, month),
  FOREIGN KEY (company_code, employee_id)
    REFERENCES employee_census(company_code, employee_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_emp_monthly_enrollment_emp
  ON aca_employee_monthly_enrollment(company_code, employee_id, tax_year, month);


-- ====================================================================
-- STORED PROCEDURE: Generate ACA Monthly Interim Data
-- ====================================================================
CREATE OR REPLACE FUNCTION generate_aca_monthly_interim(
  p_company_code VARCHAR,
  p_tax_year INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_month INTEGER;
  v_month_start DATE;
  v_month_end DATE;
  v_rows_inserted INTEGER := 0;
  v_status_rows INTEGER := 0;
  v_offer_rows INTEGER := 0;
  v_enrollment_rows INTEGER := 0;
BEGIN
  -- Delete existing data for this company/year to regenerate fresh
  DELETE FROM aca_employee_monthly_status 
  WHERE company_code = p_company_code AND tax_year = p_tax_year;
  
  DELETE FROM aca_employee_monthly_offer 
  WHERE company_code = p_company_code AND tax_year = p_tax_year;
  
  DELETE FROM aca_employee_monthly_enrollment 
  WHERE company_code = p_company_code AND tax_year = p_tax_year;

  -- Loop through all 12 months
  FOR v_month IN 1..12 LOOP
    v_month_start := DATE(p_tax_year || '-' || LPAD(v_month::TEXT, 2, '0') || '-01');
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- ===== POPULATE aca_employee_monthly_status =====
    INSERT INTO aca_employee_monthly_status (
      company_code, employee_id, tax_year, month, 
      month_start_date, month_end_date,
      employed_in_month, hired_during_month, terminated_during_month,
      employment_status_end_of_month,
      waiting_period_month, waiting_period_waived,
      hours_of_service, full_time_flag,
      add_name, add_date
    )
    SELECT
      ec.company_code,
      ec.employee_id,
      p_tax_year,
      v_month,
      v_month_start,
      v_month_end,
      
      -- Employment logic
      CASE
        WHEN ec.hire_date <= v_month_end 
         AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start)
        THEN TRUE
        ELSE FALSE
      END AS employed_in_month,
      
      CASE
        WHEN ec.hire_date >= v_month_start AND ec.hire_date <= v_month_end
        THEN TRUE
        ELSE FALSE
      END AS hired_during_month,
      
      CASE
        WHEN ec.termination_date >= v_month_start AND ec.termination_date <= v_month_end
        THEN TRUE
        ELSE FALSE
      END AS terminated_during_month,
      
      ec.employment_status AS employment_status_end_of_month,
      
      -- Waiting period logic
      CASE
        WHEN wp.waiting_period_end_date IS NOT NULL 
         AND v_month_start <= wp.waiting_period_end_date
        THEN TRUE
        ELSE FALSE
      END AS waiting_period_month,
      
      COALESCE(wp.is_waiting_period_waived, FALSE) AS waiting_period_waived,
      
      -- Hours of service from payroll
      COALESCE(
        (SELECT SUM(ph.hours_worked)
         FROM payroll_hours ph
         WHERE ph.company_code = ec.company_code
           AND ph.employee_id = ec.employee_id
           AND ph.pay_period_start >= v_month_start
           AND ph.pay_period_start <= v_month_end),
        0
      ) AS hours_of_service,
      
      -- Full-time flag (130 hours per month)
      CASE
        WHEN COALESCE(
          (SELECT SUM(ph.hours_worked)
           FROM payroll_hours ph
           WHERE ph.company_code = ec.company_code
             AND ph.employee_id = ec.employee_id
             AND ph.pay_period_start >= v_month_start
             AND ph.pay_period_start <= v_month_end),
          0
        ) >= 130 THEN TRUE
        ELSE FALSE
      END AS full_time_flag,
      
      'generate_aca_monthly_interim' AS add_name,
      CURRENT_DATE AS add_date
      
    FROM employee_census ec
    LEFT JOIN employee_waiting_period wp 
      ON wp.company_code = ec.company_code 
     AND wp.employee_id = ec.employee_id
    WHERE ec.company_code = p_company_code
      AND (ec.hire_date <= v_month_end)
      AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
    
    GET DIAGNOSTICS v_status_rows = ROW_COUNT;
    v_rows_inserted := v_rows_inserted + v_status_rows;

    -- ===== POPULATE aca_employee_monthly_offer =====
    INSERT INTO aca_employee_monthly_offer (
      company_code, employee_id, tax_year, month,
      offer_of_coverage, plan_code,
      eligible_for_coverage, eligibility_start_date, eligibility_end_date,
      coverage_tier_offered,
      add_name, add_date
    )
    SELECT
      ec.company_code,
      ec.employee_id,
      p_tax_year,
      v_month,
      
      -- Offer exists if eligibility record overlaps this month
      CASE
        WHEN epe.eligibility_start_date IS NOT NULL 
         AND epe.eligibility_start_date <= v_month_end
         AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= v_month_start)
        THEN TRUE
        ELSE FALSE
      END AS offer_of_coverage,
      
      epe.plan_code,
      
      CASE
        WHEN epe.eligibility_start_date IS NOT NULL 
         AND epe.eligibility_start_date <= v_month_end
         AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= v_month_start)
        THEN TRUE
        ELSE FALSE
      END AS eligible_for_coverage,
      
      epe.eligibility_start_date,
      epe.eligibility_end_date,
      
      -- Coverage tier from plan (simplified - could be enhanced)
      NULL AS coverage_tier_offered,
      
      'generate_aca_monthly_interim' AS add_name,
      CURRENT_DATE AS add_date
      
    FROM employee_census ec
    LEFT JOIN employee_plan_eligibility epe
      ON epe.company_code = ec.company_code
     AND epe.employee_id = ec.employee_id
     AND epe.eligibility_start_date <= v_month_end
     AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= v_month_start)
    WHERE ec.company_code = p_company_code
      AND (ec.hire_date <= v_month_end)
      AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
    
    GET DIAGNOSTICS v_offer_rows = ROW_COUNT;
    v_rows_inserted := v_rows_inserted + v_offer_rows;

    -- ===== POPULATE aca_employee_monthly_enrollment =====
    INSERT INTO aca_employee_monthly_enrollment (
      company_code, employee_id, tax_year, month,
      enrolled_in_coverage, enrollment_id, plan_code, coverage_tier,
      employee_cost, employer_cost, total_cost,
      safe_harbor_code,
      add_name, add_date
    )
    SELECT
      ec.company_code,
      ec.employee_id,
      p_tax_year,
      v_month,
      
      -- Enrolled if enrollment record overlaps this month
      CASE
        WHEN enr.effective_date IS NOT NULL 
         AND enr.effective_date <= v_month_end
         AND (enr.termination_date IS NULL OR enr.termination_date >= v_month_start)
        THEN TRUE
        ELSE FALSE
      END AS enrolled_in_coverage,
      
      enr.enrollment_id,
      enr.plan_code,
      enr.coverage_tier,
      
      -- Cost allocation (monthly average)
      pec.employee_cost,
      pec.employer_cost,
      pec.total_cost,
      
      NULL AS safe_harbor_code, -- To be calculated in future step
      
      'generate_aca_monthly_interim' AS add_name,
      CURRENT_DATE AS add_date
      
    FROM employee_census ec
    LEFT JOIN employee_plan_enrollment enr
      ON enr.company_code = ec.company_code
     AND enr.employee_id = ec.employee_id
     AND enr.effective_date <= v_month_end
     AND (enr.termination_date IS NULL OR enr.termination_date >= v_month_start)
    LEFT JOIN plan_enrollment_cost pec
      ON pec.enrollment_id = enr.enrollment_id
     AND pec.cost_period_start <= v_month_end
     AND pec.cost_period_end >= v_month_start
    WHERE ec.company_code = p_company_code
      AND (ec.hire_date <= v_month_end)
      AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
    
    GET DIAGNOSTICS v_enrollment_rows = ROW_COUNT;
    v_rows_inserted := v_rows_inserted + v_enrollment_rows;

  END LOOP;

  -- Return success summary
  RETURN json_build_object(
    'success', TRUE,
    'company_code', p_company_code,
    'tax_year', p_tax_year,
    'total_rows_inserted', v_rows_inserted,
    'message', 'ACA monthly interim tables generated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;
