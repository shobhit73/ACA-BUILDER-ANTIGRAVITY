
-- ====================================================================
-- Script: 107-create-aca-generation-v2.sql
-- Purpose: Create V2 generation function to guarantee latest logic is used.
-- Status: ACTIVE / CRITICAL
-- ====================================================================

CREATE OR REPLACE FUNCTION generate_aca_monthly_interim_v2(
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
        WHERE ems.tax_year = p_tax_year
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
        WHERE ems.tax_year = p_tax_year
        AND ems.month = v_month;
        
    END LOOP;
    
    RETURN json_build_object('success', true, 'message', 'Generated successfully (V2)');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in V2 generation: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
