-- 1. Enhanced Company Details Schema
-- Add modules array to match frontend expectations
ALTER TABLE public.company_details 
ADD COLUMN IF NOT EXISTS modules TEXT[] DEFAULT '{}';

-- 2. User-Company Mapping (Multi-Admin Support)
CREATE TABLE IF NOT EXISTS public.user_company_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_code VARCHAR REFERENCES public.company_details(company_code) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'company_admin', -- 'company_admin', 'viewer', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_code)
);

-- Ensure is_primary column exists (in case table already existed without it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_company_mapping' 
        AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE public.user_company_mapping ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.user_company_mapping ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Helper function to check if user has access to company
CREATE OR REPLACE FUNCTION public.has_company_access(p_company_code VARCHAR) 
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Company Details Policies
DROP POLICY IF EXISTS "System Admins can do everything on company_details" ON public.company_details;
DROP POLICY IF EXISTS "Employer Admins can view own company" ON public.company_details;

CREATE POLICY "System Admins can do everything on company_details" 
ON public.company_details
FOR ALL 
USING (public.is_system_admin());

CREATE POLICY "Employer Admins can view own company" 
ON public.company_details
FOR SELECT 
USING (public.has_company_access(company_code));

-- User Company Mapping Policies
CREATE POLICY "System Admins manage mappings" 
ON public.user_company_mapping
FOR ALL 
USING (public.is_system_admin());

CREATE POLICY "Users can view own mappings" 
ON public.user_company_mapping
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Data Seeding & Repair
DO $$
DECLARE
    v_karen_id UUID;
BEGIN
    -- Update Company 202 Modules
    UPDATE public.company_details 
    SET modules = ARRAY[
        'import_data', 
        'view_data', 
        'plan_configuration', 
        'generate_reports', 
        'aca_report', 
        'pdf_1095c', 
        'pdf_1094c', 
        'aca_penalties',
        'manage_users'
    ]
    WHERE company_code = '202';

    -- Find Karen Smith (try email first)
    SELECT id INTO v_karen_id FROM auth.users WHERE email = 'karen.smith@example.com';
    
    -- Fallback search if exact email doesn't match
    IF v_karen_id IS NULL THEN
        SELECT id INTO v_karen_id FROM auth.users WHERE email ILIKE 'karen.%' LIMIT 1;
    END IF;

    IF v_karen_id IS NOT NULL THEN
        -- Insert into user_company_mapping
        INSERT INTO public.user_company_mapping (user_id, company_code, role, is_primary)
        VALUES (v_karen_id, '202', 'employer_admin', TRUE)
        ON CONFLICT (user_id, company_code) DO NOTHING;

        -- Ensure Profile is consistent (optional but good for legacy checks)
        UPDATE public.profiles 
        SET company_code = '202', 
            role = 'employer_admin'
        WHERE id = v_karen_id;
        
        RAISE NOTICE 'Fixed access for Karen (ID: %)', v_karen_id;
    ELSE
        RAISE WARNING 'User Karen not found';
    END IF;
END $$;
