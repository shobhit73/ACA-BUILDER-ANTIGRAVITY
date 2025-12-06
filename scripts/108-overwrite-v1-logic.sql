
-- ====================================================================
-- Script: 108-overwrite-v1-logic.sql
-- Purpose: Overwrite the original generation function with robust V2 logic.
--          This ensures API calls to 'generate_aca_monthly_interim' works correctly.
-- Status: ACTIVE
-- ====================================================================

-- Drop the V2 function if it exists to avoid confusion
DROP FUNCTION IF EXISTS generate_aca_monthly_interim_v2(VARCHAR, INTEGER);

-- Overwrite V1 with the robust logic
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
BEGIN
    -- Log start
    RAISE NOTICE '[Auto-Fix] Starting ACA interim table generation for company: %, tax year: %', p_company_code, p_tax_year;
    
    -- Clear existing data for this company and tax year
    DELETE FROM aca_employee_monthly_status 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_offer 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_enrollment 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    -- Loop through each month
    FOR v_month IN 1..12 LOOP
        v_month_start := make_date(p_tax_year, v_month, 1);
        v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        
        -- ===== POPULATE aca_employee_monthly_status =====
        INSERT INTO aca_employee_monthly_status (
            company_code, employee_id, tax_year, month,
            month_start_date, month_end_date, employed_in_month,
            hired_during_month, terminated_during_month,
            employment_status_end_of_month, hours_of_service, full_time_flag,
            waiting_period_month, waiting_period_waived,
            add_name, add_date
        )
        SELECT 
            ec.company_code,
            ec.employee_id,
            p_tax_year,
            v_month,
            v_month_start,
            v_month_end,
            -- Logic with NULL safety
            COALESCE((ec.hire_date <= v_month_end AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start)), FALSE),
            COALESCE((ec.hire_date >= v_month_start AND ec.hire_date <= v_month_end), FALSE),
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
            'generate_aca_monthly_interim_v1_fixed',
            CURRENT_DATE
        FROM employee_census ec
        WHERE ec.company_code = p_company_code
        AND (ec.hire_date IS NULL OR ec.hire_date <= v_month_end)
        AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
        
        -- ===== POPULATE aca_employee_monthly_offer =====
        INSERT INTO aca_employee_monthly_offer (
            company_code, employee_id, tax_year, month,
            offer_of_coverage, coverage_tier_offered, plan_code,
            eligible_for_coverage, eligibility_start_date, eligibility_end_date,
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
            'generate_aca_monthly_interim_v1_fixed',
            CURRENT_DATE
        FROM aca_employee_monthly_status ems
        LEFT JOIN LATERAL (
            SELECT 
                bool_or(true) as has_offer,
                MAX(epe.plan_code) as plan_code, 
                MIN(epe.eligibility_start_date) as start_date,
                MAX(epe.eligibility_end_date) as end_date,
                NULL::varchar as coverage_tier_offered
            FROM employee_plan_eligibility epe 
            WHERE epe.company_code = ems.company_code
            AND epe.employee_id = ems.employee_id
            AND epe.eligibility_start_date <= ems.month_end_date
            AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= ems.month_start_date)
            -- LIMIT 1 logic implicit via aggregation functions
        ) agg ON TRUE
        WHERE ems.tax_year = p_tax_year
        AND ems.month = v_month
        ON CONFLICT (company_code, employee_id, tax_year, month) 
        DO UPDATE SET
            offer_of_coverage = EXCLUDED.offer_of_coverage,
            coverage_tier_offered = EXCLUDED.coverage_tier_offered,
            plan_code = EXCLUDED.plan_code,
            eligible_for_coverage = EXCLUDED.eligible_for_coverage,
            eligibility_start_date = EXCLUDED.eligibility_start_date,
            eligibility_end_date = EXCLUDED.eligibility_end_date,
            add_name = EXCLUDED.add_name,
            add_date = EXCLUDED.add_date;

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
           'generate_aca_monthly_interim_v1_fixed',
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
        WHERE ems.tax_year = p_tax_year
        AND ems.month = v_month
        ON CONFLICT (company_code, employee_id, tax_year, month) 
        DO UPDATE SET
            enrolled_in_coverage = EXCLUDED.enrolled_in_coverage,
            plan_code = EXCLUDED.plan_code,
            employee_cost = EXCLUDED.employee_cost,
            employer_cost = EXCLUDED.employer_cost,
            total_cost = EXCLUDED.total_cost,
            coverage_tier = EXCLUDED.coverage_tier,
            enrollment_id = EXCLUDED.enrollment_id,
            add_name = EXCLUDED.add_name,
            add_date = EXCLUDED.add_date;
        
    END LOOP;
    
    RETURN json_build_object('success', true, 'message', 'Generated successfully (V1 Fixed)');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in V1 Fixed generation: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
