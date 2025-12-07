-- 001-consolidated-access-control.sql
-- Consolidated RLS Policies and Security Functions
-- Merges: 014, 100, 113, 115

-- ==========================================
-- 1. Helper Security Functions
-- ==========================================

-- Check if user is System Admin (Bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'system_admin'
    );
END;
$$ LANGUAGE plpgsql;

-- Check if user has access to a specific company (System Admin or Mapped)
CREATE OR REPLACE FUNCTION public.has_company_access(p_company_code VARCHAR) 
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
BEGIN
    -- System Admins have access to everything
    IF public.is_system_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Check user mapping
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_company_mapping 
        WHERE user_id = auth.uid() 
        AND company_code = p_company_code
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. Enable RLS
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_census ENABLE ROW LEVEL SECURITY;
-- Add other tables as needed
ALTER TABLE plan_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependent ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Profiles Policies
-- ==========================================
DROP POLICY IF EXISTS "System Admin can do everything on profiles" ON profiles;
CREATE POLICY "System Admin can do everything on profiles"
    ON profiles FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (id = auth.uid());

-- ==========================================
-- 4. Company Details Policies
-- ==========================================
DROP POLICY IF EXISTS "System Admin full access companies" ON company_details;
CREATE POLICY "System Admin full access companies"
    ON company_details FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Employer Admin view assigned" ON company_details;
CREATE POLICY "Employer Admin view assigned"
    ON company_details FOR SELECT USING (has_company_access(company_code));

-- ==========================================
-- 5. User Company Mapping Policies
-- ==========================================
DROP POLICY IF EXISTS "System Admin manage mappings" ON user_company_mapping;
CREATE POLICY "System Admin manage mappings"
    ON user_company_mapping FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Users view own mappings" ON user_company_mapping;
CREATE POLICY "Users view own mappings"
    ON user_company_mapping FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- 6. Core Data Policies (Census, Plans, etc)
-- ==========================================

-- A. Employee Census
ALTER TABLE employee_census ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System Admin full access census" ON employee_census;
CREATE POLICY "System Admin full access census"
    ON employee_census FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Employer Admin manage census" ON employee_census;
CREATE POLICY "Employer Admin manage census"
    ON employee_census FOR ALL USING (has_company_access(company_code));

DROP POLICY IF EXISTS "Employee view own record" ON employee_census;
CREATE POLICY "Employee view own record"
    ON employee_census FOR SELECT USING (user_id = auth.uid());

-- B. Plan Master
ALTER TABLE plan_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System Admin full access plans" ON plan_master;
CREATE POLICY "System Admin full access plans" 
    ON plan_master FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Employer Admin manage plans" ON plan_master;
CREATE POLICY "Employer Admin manage plans" 
    ON plan_master FOR ALL USING (has_company_access(company_code));

-- C. Generic Policies for all other Company-Based Tables
-- (Address, Waiting Period, Eligibility, Enrollment, Dependent, Costs, Payroll)
-- Pattern: System Admin (ALL), Employer Admin (ALL via company_code)

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'employee_address', 
        'employee_waiting_period', 
        'employee_plan_eligibility', 
        'employee_plan_enrollment', 
        'employee_dependent', 
        'plan_enrollment_cost', -- Note: joined via enrollment_id usually, but simple policy if we add company_code? 
                                -- Wait, plan_enrollment_cost DOES NOT have company_code in 001. Check schema.
                                -- It does NOT. It joins via enrollment_id. 
        'payroll_hours'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- System Admin Policy
        EXECUTE format('DROP POLICY IF EXISTS "System Admin all %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "System Admin all %I" ON %I FOR ALL USING (public.is_system_admin())', t, t);
        
        -- Employer Admin Policy (Requires company_code column)
        IF t != 'plan_enrollment_cost' THEN
            EXECUTE format('DROP POLICY IF EXISTS "Employer Admin all %I" ON %I', t, t);
            EXECUTE format('CREATE POLICY "Employer Admin all %I" ON %I FOR ALL USING (public.has_company_access(company_code))', t, t);
        END IF;
    END LOOP;
END $$;

-- D. Special Policy for Plan Enrollment Cost (Indirect Company Access)
-- Since it relies on enrollment_id, we need a JOIN or a helper. 
-- For performance/complexity, usually we might trust the upstream, but strict RLS requires check.
-- Let's check using EXISTS on enrollment table.

ALTER TABLE plan_enrollment_cost ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System Admin cost" ON plan_enrollment_cost;
CREATE POLICY "System Admin cost" ON plan_enrollment_cost FOR ALL USING (is_system_admin());

DROP POLICY IF EXISTS "Employer Admin cost" ON plan_enrollment_cost;
CREATE POLICY "Employer Admin cost" ON plan_enrollment_cost FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employee_plan_enrollment epe
        WHERE epe.enrollment_id = plan_enrollment_cost.enrollment_id
        AND public.has_company_access(epe.company_code)
    )
);


-- ==========================================
-- 7. ACA Reporting Tables Policies
-- ==========================================

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'aca_employee_monthly_status',
        'aca_employee_monthly_offer',
        'aca_employee_monthly_enrollment',
        'aca_final_report',
        'aca_penalty_report'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- System Admin Policy
        EXECUTE format('DROP POLICY IF EXISTS "System Admin all %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "System Admin all %I" ON %I FOR ALL USING (public.is_system_admin())', t, t);
        
        -- Employer Admin Policy
        EXECUTE format('DROP POLICY IF EXISTS "Employer Admin all %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Employer Admin all %I" ON %I FOR ALL USING (public.has_company_access(company_code))', t, t);
    END LOOP;
END $$;


