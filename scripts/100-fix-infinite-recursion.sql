-- Fix Infinite Recursion in RLS Policies
-- The issue: "System Admin" policies query the 'profiles' table to check the role.
-- But accessing 'profiles' triggers the 'profiles' RLS policy, which checks the role again => Loop.

-- Solution: Create a SECURITY DEFINER function to check the role. 
-- SECURITY DEFINER functions run with the privileges of the function creator (postgres), failing to trigger the RLS check for the user.

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN 
SECURITY DEFINER -- Critical: Bypasses RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'system_admin'
    );
END;
$$ LANGUAGE plpgsql;

-- Update Policies to use the function

-- 1. PROFILES
DROP POLICY IF EXISTS "System Admin can do everything on profiles" ON profiles;
CREATE POLICY "System Admin can do everything on profiles"
    ON profiles
    FOR ALL
    USING (is_system_admin()); -- Uses function, no recursion

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- 2. COMPANY DETAILS
DROP POLICY IF EXISTS "System Admin can do everything on company_details" ON company_details;
CREATE POLICY "System Admin can do everything on company_details"
    ON company_details
    FOR ALL
    USING (is_system_admin());

-- 3. EMPLOYEE CENSUS
DROP POLICY IF EXISTS "System Admin can do everything on census" ON employee_census;
CREATE POLICY "System Admin can do everything on census"
    ON employee_census
    FOR ALL
    USING (is_system_admin());

-- 4. COMPANY MODULES
DROP POLICY IF EXISTS "System Admin can manage company modules" ON company_modules;
CREATE POLICY "System Admin can manage company modules"
    ON company_modules
    FOR ALL
    USING (is_system_admin());

-- Also apply to other tables if needed
