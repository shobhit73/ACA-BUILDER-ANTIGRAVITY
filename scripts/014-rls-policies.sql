-- RLS Policies

-- Enable RLS on modified tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_census ENABLE ROW LEVEL SECURITY;
-- Companies and others might already be enabled, ensuring here
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
-- System Admin: Full access
CREATE POLICY "System Admin can do everything on profiles"
    ON profiles
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- 2. COMPANY DETAILS
-- System Admin: Full access
CREATE POLICY "System Admin can do everything on company_details"
    ON company_details
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

-- Employer Admin: View their assigned companies
CREATE POLICY "Employer Admin can view assigned companies"
    ON company_details
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_mapping
            WHERE user_id = auth.uid() AND company_code = company_details.company_code
        )
    );

-- 3. EMPLOYEE CENSUS
-- System Admin: Full access
CREATE POLICY "System Admin can do everything on census"
    ON employee_census
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

-- Employer Admin: View/Manage census for their companies
CREATE POLICY "Employer Admin can view/manage census for owned companies"
    ON employee_census
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_company_mapping
            WHERE user_id = auth.uid() AND company_code = employee_census.company_code
        )
    );

-- Employee: View own census record
CREATE POLICY "Employee can view own census data"
    ON employee_census
    FOR SELECT
    USING (user_id = auth.uid());

-- 4. COMPANY MODULES
-- System Admin: Full access
CREATE POLICY "System Admin can manage company modules"
    ON company_modules
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

-- Employer Admin: View enabled modules for their company
CREATE POLICY "Employer Admin can view their company modules"
    ON company_modules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_mapping
            WHERE user_id = auth.uid() AND company_code = company_modules.company_code
        )
    );
