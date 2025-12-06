-- Create company_module table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.company_module (
    company_code VARCHAR REFERENCES public.company_details(company_code),
    module_code VARCHAR,
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_code, module_code)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_company_module_company_code ON public.company_module(company_code);

-- Enable RLS
ALTER TABLE public.company_module ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust as needed, basically mimic company_details access)
-- Allow read/write for System Admins
CREATE POLICY "System Admins can manage modules" ON public.company_module
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());
