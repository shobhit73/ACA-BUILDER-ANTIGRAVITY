-- ====================================================================
-- UPDATE ACA INTERIM LOGIC
-- Purpose: Add new fields to interim tables and update generation logic
-- ====================================================================

-- 1. Add new columns to interim tables

-- aca_employee_monthly_status
ALTER TABLE aca_employee_monthly_status ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(50);
ALTER TABLE aca_employee_monthly_status ADD COLUMN IF NOT EXISTS employment_type_code VARCHAR(50);

-- aca_employee_monthly_offer
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS benefit_class VARCHAR(100);
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(50);
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS option_code VARCHAR(50);
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS plan_cost NUMERIC(10, 2);
-- NEW COLUMNS FOR LOGIC UPDATE
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS is_eligible_emp BOOLEAN DEFAULT FALSE;
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS is_eligible_spouse BOOLEAN DEFAULT FALSE;
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS is_eligible_child BOOLEAN DEFAULT FALSE;
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS is_eligible_family BOOLEAN DEFAULT FALSE;
ALTER TABLE aca_employee_monthly_offer ADD COLUMN IF NOT EXISTS emp_only_cost NUMERIC(10, 2);


-- aca_employee_monthly_enrollment
ALTER TABLE aca_employee_monthly_enrollment ADD COLUMN IF NOT EXISTS enrollment_event VARCHAR(50);
ALTER TABLE aca_employee_monthly_enrollment ADD COLUMN IF NOT EXISTS option_code VARCHAR(50);


-- 2. Update Generation Procedure

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
    v_payroll_count INTEGER := 0;
    v_eligibility_count INTEGER := 0;
    v_enrollment_count INTEGER := 0;
    v_generated_status INTEGER := 0;
    v_generated_offer INTEGER := 0;
    v_generated_enrollment INTEGER := 0;
BEGIN
    -- Log start
    RAISE NOTICE '[v0] Starting ACA interim table generation for company: %, tax year: %', p_company_code, p_tax_year;
    
    -- Clear existing data for this company and tax year
    DELETE FROM aca_employee_monthly_status 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_offer 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    DELETE FROM aca_employee_monthly_enrollment 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    RAISE NOTICE '[v0] Cleared existing interim data';
    
    -- Count source data - with more lenient filters
    SELECT COUNT(*) INTO v_employee_count
    FROM employee_census
    WHERE company_code = p_company_code
    AND (hire_date IS NULL OR EXTRACT(YEAR FROM hire_date) <= p_tax_year)
    AND (termination_date IS NULL OR EXTRACT(YEAR FROM termination_date) >= p_tax_year);
    
    SELECT COUNT(*) INTO v_payroll_count
    FROM payroll_hours
    WHERE company_code = p_company_code
    AND EXTRACT(YEAR FROM pay_period_start) = p_tax_year;
    
    SELECT COUNT(*) INTO v_eligibility_count
    FROM employee_plan_eligibility
    WHERE company_code = p_company_code;
    
    SELECT COUNT(*) INTO v_enrollment_count
    FROM employee_plan_enrollment
    WHERE company_code = p_company_code;
    
    RAISE NOTICE '[v0] Source data counts - Employees: %, Payroll: %, Eligibility: %, Enrollment: %', 
        v_employee_count, v_payroll_count, v_eligibility_count, v_enrollment_count;
    
    -- Check if we have minimum required data
    IF v_employee_count = 0 THEN
        RAISE NOTICE '[v0] WARNING: No employees found for company % in tax year %', p_company_code, p_tax_year;
        RETURN json_build_object(
            'success', false,
            'error', 'No employees found',
            'details', json_build_object(
                'employees', v_employee_count,
                'payrollHours', v_payroll_count,
                'eligibility', v_eligibility_count,
                'enrollment', v_enrollment_count
            )
        );
    END IF;
    
    -- Loop through each month
    FOR v_month IN 1..12 LOOP
        v_month_start := make_date(p_tax_year, v_month, 1);
        v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        
        RAISE NOTICE '[v0] Processing month % (% to %)', v_month, v_month_start, v_month_end;
        
        -- ===== POPULATE aca_employee_monthly_status =====
        INSERT INTO aca_employee_monthly_status (
            company_code, employee_id, tax_year, month,
            month_start_date, month_end_date, employed_in_month,
            hired_during_month, terminated_during_month,
            employment_status_end_of_month, hours_of_service, full_time_flag,
            pay_frequency, employment_type_code
        )
        SELECT 
            ec.company_code,
            ec.employee_id,
            p_tax_year,
            v_month,
            v_month_start,
            v_month_end,
            CASE 
                WHEN ec.termination_date IS NOT NULL AND ec.termination_date < v_month_start THEN false
                WHEN ec.hire_date IS NOT NULL AND ec.hire_date > v_month_end THEN false
                ELSE true
            END as employed_in_month,
            CASE 
                WHEN ec.hire_date >= v_month_start AND ec.hire_date <= v_month_end THEN true
                ELSE false
            END as hired_during_month,
            CASE 
                WHEN ec.termination_date >= v_month_start AND ec.termination_date <= v_month_end THEN true
                ELSE false
            END as terminated_during_month,
            CASE 
                WHEN ec.termination_date IS NOT NULL AND ec.termination_date < v_month_start THEN 'Terminated'
                WHEN ec.hire_date IS NOT NULL AND ec.hire_date > v_month_end THEN 'Not Hired'
                ELSE ec.employment_status
            END as employment_status_end_of_month,
            COALESCE(
                (SELECT SUM(hours_worked) 
                 FROM payroll_hours ph
                 WHERE ph.company_code = ec.company_code
                 AND ph.employee_id = ec.employee_id
                 AND ph.pay_period_start >= v_month_start
                 AND ph.pay_period_start <= v_month_end),
                0
            ) as hours_of_service,
            COALESCE(
                (SELECT SUM(hours_worked) 
                 FROM payroll_hours ph
                 WHERE ph.company_code = ec.company_code
                 AND ph.employee_id = ec.employee_id
                 AND ph.pay_period_start >= v_month_start
                 AND ph.pay_period_start <= v_month_end),
                0
            ) >= 130 as full_time_flag,
            ec.pay_frequency,
            ec.employment_type_code
        FROM employee_census ec
        WHERE ec.company_code = p_company_code
        AND (ec.hire_date IS NULL OR ec.hire_date <= v_month_end)
        AND (ec.termination_date IS NULL OR ec.termination_date >= v_month_start);
        
        GET DIAGNOSTICS v_generated_status = ROW_COUNT;
        RAISE NOTICE '[v0] Generated % status records for month %', v_generated_status, v_month;
        
        -- ===== POPULATE aca_employee_monthly_offer =====
        INSERT INTO aca_employee_monthly_offer (
            company_code, employee_id, tax_year, month,
            offer_of_coverage, coverage_tier_offered, plan_code,
            eligible_for_coverage, eligibility_start_date, eligibility_end_date,
            benefit_class, measurement_type, option_code, plan_cost,
            is_eligible_emp, is_eligible_spouse, is_eligible_child, is_eligible_family, emp_only_cost
        )
        SELECT 
            ems.company_code,
            ems.employee_id,
            ems.tax_year,
            ems.month,
            COALESCE(agg.has_offer, false) as offer_of_coverage,
            NULL as coverage_tier_offered,
            agg.plan_code,
            COALESCE(agg.has_offer, false) as eligible_for_coverage,
            agg.start_date,
            agg.end_date,
            agg.benefit_class,
            agg.measurement_type,
            agg.option_code,
            agg.plan_cost,
            COALESCE(agg.is_eligible_emp, false),
            COALESCE(agg.is_eligible_spouse, false),
            COALESCE(agg.is_eligible_child, false),
            COALESCE(agg.is_eligible_family, false),
            agg.emp_only_cost
        FROM aca_employee_monthly_status ems
        LEFT JOIN LATERAL (
            SELECT 
                bool_or(true) as has_offer,
                MAX(epe.plan_code) as plan_code, 
                MIN(epe.eligibility_start_date) as start_date,
                MAX(epe.eligibility_end_date) as end_date,
                
                -- Flags for coverage tiers using Plan Master Configuration
                bool_or(
                    -- Fallback to legacy check if config is missing
                    (pm.option_emp IS NULL AND (epe.benefit_class ILIKE '%01%' OR epe.benefit_class ILIKE '%EMP%' OR epe.benefit_class = 'Employee'))
                    OR
                    -- Configured check
                    (epe.option_code IS NOT NULL AND (
                        epe.option_code = pm.option_emp OR 
                        epe.option_code = pm.option_emp_child OR 
                        epe.option_code = pm.option_emp_spouse OR 
                        epe.option_code = pm.option_emp_family
                    ))
                ) as is_eligible_emp,
                
                bool_or(
                    (pm.option_emp_spouse IS NULL AND (epe.benefit_class ILIKE '%03%' OR epe.benefit_class ILIKE '%SPOUSE%'))
                    OR
                    (epe.option_code IS NOT NULL AND (
                        epe.option_code = pm.option_emp_spouse OR 
                        epe.option_code = pm.option_emp_family
                    ))
                ) as is_eligible_spouse,
                
                bool_or(
                    (pm.option_emp_child IS NULL AND (epe.benefit_class ILIKE '%02%' OR epe.benefit_class ILIKE '%CHILD%'))
                    OR
                    (epe.option_code IS NOT NULL AND (
                        epe.option_code = pm.option_emp_child OR 
                        epe.option_code = pm.option_emp_family
                    ))
                ) as is_eligible_child,
                
                bool_or(
                    (pm.option_emp_family IS NULL AND (epe.benefit_class ILIKE '%04%' OR epe.benefit_class ILIKE '%FAM%'))
                    OR
                    (epe.option_code IS NOT NULL AND epe.option_code = pm.option_emp_family)
                ) as is_eligible_family,
                
                -- Cost (Self Only) - Look for specific option code match
                MIN(CASE 
                    WHEN pm.option_emp IS NOT NULL AND epe.option_code = pm.option_emp THEN epe.plan_cost 
                    WHEN pm.option_emp IS NULL AND (epe.benefit_class ILIKE '%01%' OR epe.benefit_class ILIKE '%EMP%') THEN epe.plan_cost
                    ELSE NULL 
                END) as emp_only_cost,
                
                -- Best Benefit Class (for display/legacy)
                (ARRAY_AGG(epe.benefit_class ORDER BY epe.plan_cost DESC))[1] as benefit_class,
                 -- Best Plan Cost (for display/legacy)
                (ARRAY_AGG(epe.plan_cost ORDER BY epe.plan_cost ASC))[1] as plan_cost,
                MAX(epe.measurement_type) as measurement_type,
                MAX(epe.option_code) as option_code
            FROM employee_plan_eligibility epe 
            LEFT JOIN plan_master pm ON epe.plan_code = pm.plan_code
            WHERE epe.company_code = ems.company_code
            AND epe.employee_id = ems.employee_id
            AND epe.eligibility_start_date <= ems.month_end_date
            AND (epe.eligibility_end_date IS NULL OR epe.eligibility_end_date >= ems.month_start_date)
        ) agg ON TRUE
        WHERE ems.tax_year = p_tax_year
        AND ems.month = v_month;
        
        GET DIAGNOSTICS v_generated_offer = ROW_COUNT;
        RAISE NOTICE '[v0] Generated % offer records for month %', v_generated_offer, v_month;
        
        -- ===== POPULATE aca_employee_monthly_enrollment =====
        INSERT INTO aca_employee_monthly_enrollment (
            company_code, employee_id, tax_year, month,
            enrolled_in_coverage, plan_code, employee_cost, employer_cost, total_cost,
            coverage_tier,
            enrollment_event, option_code
        )
        SELECT 
            ems.company_code,
            ems.employee_id,
            ems.tax_year,
            ems.month,
            CASE WHEN epe_enroll.enrollment_id IS NOT NULL THEN true ELSE false END as enrolled_in_coverage,
            epe_enroll.plan_code,
            pec.employee_cost,
            pec.employer_cost,
            pec.total_cost,
            epe_enroll.coverage_tier,
            epe_enroll.enrollment_event,
            epe_enroll.option_code
        FROM aca_employee_monthly_status ems
        LEFT JOIN LATERAL (
            SELECT * FROM employee_plan_enrollment epe 
            WHERE epe.company_code = ems.company_code
            AND epe.employee_id = ems.employee_id
            AND epe.effective_date <= ems.month_end_date
            AND (epe.termination_date IS NULL OR epe.termination_date >= ems.month_start_date)
            ORDER BY epe.effective_date DESC, epe.created_at DESC
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
        
        GET DIAGNOSTICS v_generated_enrollment = ROW_COUNT;
        RAISE NOTICE '[v0] Generated % enrollment records for month %', v_generated_enrollment, v_month;
    END LOOP;
    
    -- Return success with detailed counts
    RETURN json_build_object(
        'success', true,
        'message', 'ACA monthly interim tables generated successfully',
        'details', json_build_object(
            'companyCode', p_company_code,
            'taxYear', p_tax_year,
            'sourceData', json_build_object(
                'employees', v_employee_count,
                'payrollHours', v_payroll_count,
                'eligibility', v_eligibility_count,
                'enrollment', v_enrollment_count
            ),
            'generatedRecords', json_build_object(
                'status', (SELECT COUNT(*) FROM aca_employee_monthly_status WHERE company_code = p_company_code AND tax_year = p_tax_year),
                'offer', (SELECT COUNT(*) FROM aca_employee_monthly_offer WHERE company_code = p_company_code AND tax_year = p_tax_year),
                'enrollment', (SELECT COUNT(*) FROM aca_employee_monthly_enrollment WHERE company_code = p_company_code AND tax_year = p_tax_year)
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[v0] ERROR: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'details', json_build_object(
                'employees', v_employee_count,
                'payrollHours', v_payroll_count,
                'eligibility', v_eligibility_count,
                'enrollment', v_enrollment_count
            )
        );
END;
$$ LANGUAGE plpgsql;
