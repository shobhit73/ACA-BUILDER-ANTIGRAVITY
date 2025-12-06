-- Fix Karen's Profile & Ensure she can read it

-- 1. Ensure Profile Exists & Has Company Code
DO $$
DECLARE
    v_karen_id UUID;
BEGIN
    SELECT id INTO v_karen_id FROM auth.users WHERE email Like 'karen.%' LIMIT 1;
    
    IF v_karen_id IS NOT NULL THEN
        -- Upsert profile ensuring company_code is set
        INSERT INTO public.profiles (id, email, first_name, last_name, role, company_code)
        VALUES (
            v_karen_id, 
            'karen.smith@example.com', 
            'Karen', 
            'Smith', 
            'employer_admin', 
            '202'
        )
        ON CONFLICT (id) DO UPDATE SET
            company_code = '202',
            role = 'employer_admin';
            
        RAISE NOTICE 'Updated profile for Karen (%)', v_karen_id;
    else
        RAISE WARNING 'Karen user not found in auth.users';
    END IF;
END $$;

-- 2. Verify/Fix RLS for Profiles
-- Ensure users can read their own company_code
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- 3. Verify/Fix RLS for Company Details
-- Ensure Employer Admin can read company details if mapped
DROP POLICY IF EXISTS "Employer Admins can view own company" ON public.company_details;
CREATE POLICY "Employer Admins can view own company"
    ON public.company_details
    FOR SELECT
    USING (
        -- Check profiles (legacy/simple) OR user_company_mapping (robust)
        company_code IN (
            SELECT company_code FROM profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_company_mapping 
            WHERE user_id = auth.uid() 
            AND company_code = company_details.company_code
        )
    );
