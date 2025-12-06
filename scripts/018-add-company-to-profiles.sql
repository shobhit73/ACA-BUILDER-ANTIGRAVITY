-- Add company_code and is_active to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_code TEXT REFERENCES public.company_details(company_code),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_code ON public.profiles(company_code);

-- Update RLS policies (optional but recommended)
-- Ensure Employer Admins can access data related to their company_code
-- (This is usually handled by the `is_system_admin()` or `get_my_company_code()` helper in other policies)
