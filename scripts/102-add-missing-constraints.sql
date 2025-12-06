
-- Fix missing unique constraints required for UPSERT operations across ALL import tables
-- This ensures robustness for all data types, not just Payroll Hours.

-- 1. Company Details (Primary Key check - usually safe, but verifying)
-- ON CONFLICT (company_code) -> PK exists.

-- 2. Plan Master
-- ON CONFLICT (company_code, plan_code)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_master_unique_idx' AND conrelid = 'plan_master'::regclass) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_master_pkey' AND conrelid = 'plan_master'::regclass) THEN -- Only add if not PK
             ALTER TABLE plan_master ADD CONSTRAINT plan_master_unique_idx UNIQUE (company_code, plan_code);
        END IF;
    END IF;
END $$;

-- 3. Employee Census
-- ON CONFLICT (company_code, employee_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_census_unique_idx' AND conrelid = 'employee_census'::regclass) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_census_pkey' AND conrelid = 'employee_census'::regclass) THEN
            ALTER TABLE employee_census ADD CONSTRAINT employee_census_unique_idx UNIQUE (company_code, employee_id);
        END IF;
    END IF;
END $$;

-- 4. Employee Address
-- ON CONFLICT (company_code, employee_id, effective_date)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_address_unique_idx' AND conrelid = 'employee_address'::regclass) THEN
        ALTER TABLE employee_address ADD CONSTRAINT employee_address_unique_idx UNIQUE (company_code, employee_id, effective_date);
    END IF;
END $$;

-- 5. Employee Waiting Period
-- ON CONFLICT (company_code, employee_id) -- Note: Script 016 uses this conflict target
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_waiting_period_unique_idx' AND conrelid = 'employee_waiting_period'::regclass) THEN
        ALTER TABLE employee_waiting_period ADD CONSTRAINT employee_waiting_period_unique_idx UNIQUE (company_code, employee_id);
    END IF;
END $$;

-- 6. Employee Plan Eligibility
-- ON CONFLICT (company_code, employee_id, plan_code, eligibility_start_date)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_plan_eligibility_unique_idx' AND conrelid = 'employee_plan_eligibility'::regclass) THEN
        ALTER TABLE employee_plan_eligibility ADD CONSTRAINT employee_plan_eligibility_unique_idx UNIQUE (company_code, employee_id, plan_code, eligibility_start_date);
    END IF;
END $$;

-- 7. Employee Plan Enrollment
-- ON CONFLICT (enrollment_id) -> PK usually safe, ensuring.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_plan_enrollment_pkey' AND conrelid = 'employee_plan_enrollment'::regclass) THEN
        ALTER TABLE employee_plan_enrollment ADD CONSTRAINT employee_plan_enrollment_unique_idx UNIQUE (enrollment_id);
    END IF;
END $$;

-- 8. Employee Dependent
-- ON CONFLICT (company_code, employee_id, dependent_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_dependent_unique_idx' AND conrelid = 'employee_dependent'::regclass) THEN
        ALTER TABLE employee_dependent ADD CONSTRAINT employee_dependent_unique_idx UNIQUE (company_code, employee_id, dependent_id);
    END IF;
END $$;

-- 9. Plan Enrollment Cost
-- ON CONFLICT (enrollment_id, cost_period_start)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_enrollment_cost_unique_idx' AND conrelid = 'plan_enrollment_cost'::regclass) THEN
        ALTER TABLE plan_enrollment_cost ADD CONSTRAINT plan_enrollment_cost_unique_idx UNIQUE (enrollment_id, cost_period_start);
    END IF;
END $$;

-- 10. Payroll Hours
-- ON CONFLICT (company_code, employee_id, pay_period_start, pay_period_end)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_hours_unique_idx' AND conrelid = 'payroll_hours'::regclass) THEN
        ALTER TABLE payroll_hours ADD CONSTRAINT payroll_hours_unique_idx UNIQUE (company_code, employee_id, pay_period_start, pay_period_end);
    END IF;
END $$;
