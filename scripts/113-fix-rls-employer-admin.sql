-- Allow Employer Admins to view their own Company Details
CREATE POLICY "Employer Admins can view own company"
    ON company_details
    FOR SELECT
    USING (
        company_code IN (
            SELECT company_code FROM profiles
            WHERE id = auth.uid()
            AND role = 'employer_admin'
        )
    );

-- Allow Employer Admins to view their own Company Modules (if table is used, though currently we use company_details.modules)
DROP POLICY IF EXISTS "Employer Admins can view own modules" ON company_modules;
CREATE POLICY "Employer Admins can view own modules"
    ON company_modules
    FOR SELECT
    USING (
        company_code IN (
            SELECT company_code FROM profiles
            WHERE id = auth.uid()
            AND role = 'employer_admin'
        )
    );
