-- Setup Test Employer (Company 303)
-- usage: Replace 'james.brown@example.com' with the email of the user you want to test with.

DO $$
DECLARE
    v_test_email TEXT := 'james.brown@example.com'; -- <<< CHANGE THIS to your test user's email
    v_user_id UUID;
    v_company_code TEXT := '303';
BEGIN
    -- 1. Create/Update Company 303
    INSERT INTO public.company_details (company_code, company_name, modules)
    VALUES (
        v_company_code, 
        'Test Company 303', 
        ARRAY['import_data', 'view_data'] -- Limited modules (No Reports, No ACA)
    )
    ON CONFLICT (company_code) DO UPDATE SET
        modules = ARRAY['import_data', 'view_data'];

    -- 2. Find User
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_test_email;

    IF v_user_id IS NOT NULL THEN
        -- 3. Update Profile
        INSERT INTO public.profiles (id, email, role, company_code, first_name, last_name)
        VALUES (v_user_id, v_test_email, 'employer_admin', v_company_code, 'Test', 'Employer')
        ON CONFLICT (id) DO UPDATE SET
            role = 'employer_admin',
            company_code = v_company_code;

        -- 4. Create Mapping
        INSERT INTO public.user_company_mapping (user_id, company_code, role, is_primary)
        VALUES (v_user_id, v_company_code, 'employer_admin', TRUE)
        ON CONFLICT (user_id, company_code) DO NOTHING;

        RAISE NOTICE 'User % setup as Admin for Company %', v_test_email, v_company_code;
    ELSE
        RAISE WARNING 'User with email % not found. Please sign up the user first.', v_test_email;
    END IF;
END $$;
