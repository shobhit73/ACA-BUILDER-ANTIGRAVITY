-- ====================================================================
-- ACA FINAL REPORT & CODE GENERATION
-- Purpose: Calculate IRS 1095-C Line 14 & 16 codes from interim data
-- ====================================================================

-- 1. Create Final Report Table
CREATE TABLE IF NOT EXISTS aca_final_report (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    tax_year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- Calculated Codes
    line_14_code VARCHAR(2),   -- Offer of Coverage (1A, 1E, 1H, etc.)
    line_15_cost NUMERIC(10,2), -- Employee Share of Lowest Cost Monthly Premium
    line_16_code VARCHAR(2),   -- Safe Harbor (2A, 2C, 2F, etc.)
    
    -- Meta
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (company_code, employee_id, tax_year, month),
    FOREIGN KEY (company_code, employee_id) REFERENCES employee_census(company_code, employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aca_final_report_lookup 
    ON aca_final_report(company_code, tax_year, month);

-- 2. Generate Final Report Procedure
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
    -- Clear existing report data for this company/year
    DELETE FROM aca_final_report 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    -- Loop through months 1-12
    FOR v_month IN 1..12 LOOP
        
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
                         AND COALESCE(offer.emp_only_cost, 99999) <= 50 THEN '1A'
                         
                    -- 1E: Full Time + MEC/MV + Family + Emp + Not Affordable
                    WHEN status.full_time_flag IS TRUE 
                         AND pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_family IS TRUE 
                         AND offer.is_eligible_emp IS TRUE
                         AND COALESCE(offer.emp_only_cost, 99999) > 50 THEN '1E'
                         
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
                    -- Note: Logic above might set 1H, so we need to replicate condition or check result later.
                    -- But we can't check result here. So replicate "No Offer" condition.
                    WHEN (offer.offer_of_coverage IS NULL OR offer.offer_of_coverage = false OR pm.me = 'N') THEN NULL
                    
                    -- Blank for 1A condition
                    WHEN (status.full_time_flag IS TRUE 
                         AND pm.mvc = 'Y' AND pm.me = 'Y'
                         AND offer.is_eligible_family IS TRUE 
                         AND offer.is_eligible_emp IS TRUE
                         AND COALESCE(offer.emp_only_cost, 99999) <= 50) THEN NULL
                    
                    -- Otherwise, show the lowest cost monthly premium for self-only coverage
                    ELSE offer.emp_only_cost
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
                    
                    -- 2D: Waiting Period
                    -- (Need waiting period logic in status table, currently missing, assuming false for now or check employment_status)
                    -- WHEN status.waiting_period_month = true THEN '2D'
                    
                    -- 2F: W-2 Safe Harbor (Affordable)
                    WHEN offer.offer_of_coverage = true AND offer.emp_only_cost > 0 THEN '2F'
                    
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
            LEFT JOIN plan_master pm ON pm.plan_code = offer.plan_code
            LEFT JOIN aca_employee_monthly_enrollment enroll 
                ON status.company_code = enroll.company_code 
                AND status.employee_id = enroll.employee_id 
                AND status.tax_year = enroll.tax_year 
                AND status.month = enroll.month
            LEFT JOIN plan_master pm_enroll ON pm_enroll.plan_code = enroll.plan_code
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
        'message', 'ACA final report generated successfully',
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
$$ LANGUAGE plpgsql;
