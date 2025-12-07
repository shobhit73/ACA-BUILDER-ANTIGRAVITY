-- 005-seed-data.sql
-- Consolidated Test Data & Seeding
-- Merges: 116, 117

-- 1. Karen Smith (Employer Admin for 202)
DO $$
DECLARE
    v_karen_id UUID;
    v_company_code TEXT := '202';
BEGIN
    SELECT id INTO v_karen_id FROM auth.users WHERE email LIKE 'karen.%' LIMIT 1;
    
    -- Ensure Company 202 exists
    INSERT INTO public.company_details (company_code, company_name, modules, is_active)
    VALUES ('202', 'Demo Company 202', '{}', TRUE)
    ON CONFLICT (company_code) DO NOTHING;
    
    IF v_karen_id IS NOT NULL THEN
        -- Upsert profile
        INSERT INTO public.profiles (id, email, first_name, last_name, role, company_code)
        VALUES (v_karen_id, 'karen.smith@example.com', 'Karen', 'Smith', 'employer_admin', v_company_code)
        ON CONFLICT (id) DO UPDATE SET
            company_code = v_company_code,
            role = 'employer_admin';

        -- Upsert User-Company Mapping
        INSERT INTO public.user_company_mapping (user_id, company_code, role, is_primary)
        VALUES (v_karen_id, v_company_code, 'employer_admin', TRUE)
        ON CONFLICT (user_id, company_code) DO NOTHING;

        -- Update Company 202 Modules (Ensure full access)
        UPDATE public.company_details 
        SET modules = ARRAY[
            'import_data', 'view_data', 'plan_configuration', 
            'generate_reports', 'aca_report', 'pdf_1095c', 'pdf_1094c', 
            'aca_penalties', 'manage_users'
        ]
        WHERE company_code = v_company_code;
            
        RAISE NOTICE 'Updated Karen (ID: %) for Company %', v_karen_id, v_company_code;
    ELSE
        RAISE WARNING 'Karen user not found via email search';
    END IF;
END $$;

-- 2. James Brown / Test User (Company 303)
DO $$
DECLARE
    v_test_email TEXT := 'james.brown@example.com'; 
    v_user_id UUID;
    v_company_code TEXT := '303';
BEGIN
    -- Create/Update Company 303
    INSERT INTO public.company_details (company_code, company_name, modules, is_active)
    VALUES (
        v_company_code, 
        'Test Company 303', 
        ARRAY['import_data', 'view_data'], -- Limited modules
        TRUE
    )
    ON CONFLICT (company_code) DO UPDATE SET
        modules = ARRAY['import_data', 'view_data'];

    -- Find User
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_test_email;

    IF v_user_id IS NOT NULL THEN
        -- Update Profile
        INSERT INTO public.profiles (id, email, role, company_code, first_name, last_name)
        VALUES (v_user_id, v_test_email, 'employer_admin', v_company_code, 'Test', 'Employer')
        ON CONFLICT (id) DO UPDATE SET
            role = 'employer_admin',
            company_code = v_company_code;

        -- Create Mapping
        INSERT INTO public.user_company_mapping (user_id, company_code, role, is_primary)
        VALUES (v_user_id, v_company_code, 'employer_admin', TRUE)
        ON CONFLICT (user_id, company_code) DO NOTHING;

        RAISE NOTICE 'User % setup as Admin for Company %', v_test_email, v_company_code;
    ELSE
        RAISE WARNING 'User with email % not found. Please sign up the user first.', v_test_email;
    END IF;
END $$;
