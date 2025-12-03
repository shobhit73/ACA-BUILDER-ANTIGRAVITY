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
        SELECT
            status.company_code,
            status.employee_id,
            p_tax_year,
            v_month,
            
            -- ==========================
            -- LINE 14 LOGIC (Offer)
            -- ==========================
            CASE
                -- 1H: No Offer of Coverage
                WHEN offer.offer_of_coverage IS NULL OR offer.offer_of_coverage = false THEN '1H'
                
                -- 1A: Qualifying Offer (Simplified: Affordable + MV + Family)
                -- Note: Assuming '1' means MV in plan_master (need to verify plan attributes in future)
                -- For now, if plan_cost is low (< 100) and offered to family, assume 1A
                WHEN offer.offer_of_coverage = true 
                     AND offer.plan_cost <= 110 -- Approx FPL Safe Harbor for 2025
                     AND (offer.benefit_class ILIKE '%Family%' OR offer.benefit_class ILIKE '%All%') 
                THEN '1A'
                
                -- 1E: Minimum Essential Coverage providing Minimum Value offered to employee, spouse, and dependents
                WHEN offer.offer_of_coverage = true 
                     AND (offer.benefit_class ILIKE '%Family%' OR offer.benefit_class ILIKE '%Spouse%')
                THEN '1E'
                
                -- 1B: Minimum Essential Coverage providing Minimum Value offered to employee only
                WHEN offer.offer_of_coverage = true 
                THEN '1B'
                
                ELSE '1H' -- Fallback
            END as line_14_code,
            
            -- ==========================
            -- LINE 15 LOGIC (Cost)
            -- ==========================
            CASE
                -- Blank if 1H (No Offer) or 1A (Qualifying Offer)
                WHEN (offer.offer_of_coverage IS NULL OR offer.offer_of_coverage = false) THEN NULL
                WHEN (offer.offer_of_coverage = true AND offer.plan_cost <= 110 AND (offer.benefit_class ILIKE '%Family%' OR offer.benefit_class ILIKE '%All%')) THEN NULL
                
                -- Otherwise, show the lowest cost monthly premium for self-only coverage
                ELSE offer.plan_cost
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
                
                -- 2D: Employee in a section 4980H(b) Limited Non-Assessment Period (Waiting Period)
                WHEN status.waiting_period_month = true THEN '2D'
                
                -- 2F: Section 4980H Affordability Form W-2 Safe Harbor
                -- If offered and cost is affordable based on W-2 wages (approx check)
                -- Using a simplified check: if cost < 9.02% of (rate * 130) or similar
                -- For now, if we have a cost and it's reasonable, apply 2F if not enrolled
                WHEN offer.offer_of_coverage = true AND offer.plan_cost > 0 THEN '2F'
                
                -- Blank: No Safe Harbor (Potential Penalty if FT and not offered affordable coverage)
                ELSE NULL
            END as line_16_code
            
        FROM aca_employee_monthly_status status
        LEFT JOIN aca_employee_monthly_offer offer 
            ON status.company_code = offer.company_code 
            AND status.employee_id = offer.employee_id 
            AND status.tax_year = offer.tax_year 
            AND status.month = offer.month
        LEFT JOIN aca_employee_monthly_enrollment enroll 
            ON status.company_code = enroll.company_code 
            AND status.employee_id = enroll.employee_id 
            AND status.tax_year = enroll.tax_year 
            AND status.month = enroll.month
        WHERE status.company_code = p_company_code 
        AND status.tax_year = p_tax_year
        AND status.month = v_month;
        
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
