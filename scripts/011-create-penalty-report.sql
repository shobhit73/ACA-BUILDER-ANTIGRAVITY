-- ====================================================================
-- ACA PENALTY REPORT GENERATION
-- Purpose: Calculate potential Penalty A and Penalty B liabilities
-- ====================================================================

-- 1. Create Penalty Report Table
CREATE TABLE IF NOT EXISTS aca_penalty_report (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    tax_year INTEGER NOT NULL,
    penalty_type VARCHAR(1) NOT NULL, -- 'A' or 'B'
    reason TEXT,
    
    -- Monthly Penalty Amounts
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

-- 2. Generate Penalty Report Procedure
CREATE OR REPLACE FUNCTION generate_aca_penalties(
    p_company_code VARCHAR,
    p_tax_year INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_penalty_a_rate NUMERIC := 241.67;
    v_penalty_b_rate NUMERIC := 362.50;
    v_count INTEGER := 0;
BEGIN
    -- Clear existing penalties for this company/year
    DELETE FROM aca_penalty_report 
    WHERE company_code = p_company_code AND tax_year = p_tax_year;
    
    -- Insert Penalties
    INSERT INTO aca_penalty_report (
        company_code, employee_id, tax_year, penalty_type, reason,
        jan_amount, feb_amount, mar_amount, apr_amount, may_amount, jun_amount,
        jul_amount, aug_amount, sep_amount, oct_amount, nov_amount, dec_amount,
        total_amount
    )
    SELECT
        company_code,
        employee_id,
        tax_year,
        penalty_type,
        CASE 
            WHEN penalty_type = 'A' THEN 'Penalty A: No MEC offered <br/> The employee was not offered minimum essential coverage (MEC) during the months in which the penalty was incurred.'
            ELSE 'Penalty B: Waived Unaffordable Coverage <br/> The employee was offered minimum essential coverage (MEC), but the lowest-cost option for employee-only coverage was not affordable, meaning it cost more than the $50 threshold. The employee chose to waive this unaffordable coverage.'
        END as reason,
        
        -- Calculate Monthly Amounts
        SUM(CASE WHEN month = 1 THEN amount ELSE 0 END) as jan,
        SUM(CASE WHEN month = 2 THEN amount ELSE 0 END) as feb,
        SUM(CASE WHEN month = 3 THEN amount ELSE 0 END) as mar,
        SUM(CASE WHEN month = 4 THEN amount ELSE 0 END) as apr,
        SUM(CASE WHEN month = 5 THEN amount ELSE 0 END) as may,
        SUM(CASE WHEN month = 6 THEN amount ELSE 0 END) as jun,
        SUM(CASE WHEN month = 7 THEN amount ELSE 0 END) as jul,
        SUM(CASE WHEN month = 8 THEN amount ELSE 0 END) as aug,
        SUM(CASE WHEN month = 9 THEN amount ELSE 0 END) as sep,
        SUM(CASE WHEN month = 10 THEN amount ELSE 0 END) as oct,
        SUM(CASE WHEN month = 11 THEN amount ELSE 0 END) as nov,
        SUM(CASE WHEN month = 12 THEN amount ELSE 0 END) as dec,
        
        SUM(amount) as total
        
    FROM (
        SELECT
            company_code,
            employee_id,
            tax_year,
            month,
            CASE
                -- Penalty A Logic: No Offer (1H) AND No Safe Harbor (Line 16 is NULL)
                WHEN line_14_code = '1H' AND line_16_code IS NULL THEN 'A'
                
                -- Penalty B Logic: Offer (Not 1H) AND Unaffordable (> 50) AND No Safe Harbor (Line 16 is NULL)
                -- Note: If Line 16 is 2F/2G/2H, it's safe. If 2C, enrolled. If NULL, potentially liable.
                WHEN line_14_code != '1H' AND COALESCE(line_15_cost, 0) > 50 AND line_16_code IS NULL THEN 'B'
                
                ELSE NULL
            END as penalty_type,
            CASE
                WHEN line_14_code = '1H' AND line_16_code IS NULL THEN v_penalty_a_rate
                WHEN line_14_code != '1H' AND COALESCE(line_15_cost, 0) > 50 AND line_16_code IS NULL THEN v_penalty_b_rate
                ELSE 0
            END as amount
        FROM aca_final_report
        WHERE company_code = p_company_code AND tax_year = p_tax_year
    ) monthly_data
    WHERE penalty_type IS NOT NULL
    GROUP BY company_code, employee_id, tax_year, penalty_type;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Penalties generated successfully',
        'count', v_count
    );
END;
$$ LANGUAGE plpgsql;
