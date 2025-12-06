-- Add is_active column to company_details
ALTER TABLE public.company_details 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update upsert function to include is_active
CREATE OR REPLACE FUNCTION public.upsert_company_details(
    p_company_code TEXT,
    p_company_name TEXT,
    p_dba_name TEXT DEFAULT NULL,
    p_ein TEXT DEFAULT NULL,
    p_address_line_1 TEXT DEFAULT NULL,
    p_address_line_2 TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_contact_name TEXT DEFAULT NULL, -- Fixed typo in signature if any
    p_contact_phone TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_is_authoritative_transmittal BOOLEAN DEFAULT FALSE,
    p_is_agg_ale_group BOOLEAN DEFAULT FALSE,
    p_cert_qualifying_offer BOOLEAN DEFAULT FALSE,
    p_cert_98_percent_offer BOOLEAN DEFAULT FALSE,
    p_add_name TEXT DEFAULT NULL,
    p_add_date TEXT DEFAULT NULL,
    p_modified_by UUID DEFAULT NULL,
    p_modified_on TIMESTAMPTZ DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE -- New Parameter
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    INSERT INTO public.company_details (
        company_code, company_name, dba_name, ein,
        address_line_1, address_line_2, city, state, zip_code, country,
        contact_name, contact_phone, contact_email,
        is_authoritative_transmittal, is_agg_ale_group, cert_qualifying_offer, cert_98_percent_offer,
        add_name, add_date, modified_by, modified_on, is_active,
        updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein,
        p_address_line_1, p_address_line_2, p_city, p_state, p_zip_code, p_country,
        p_contact_name, p_contact_phone, p_contact_email,
        p_is_authoritative_transmittal, p_is_agg_ale_group, p_cert_qualifying_offer, p_cert_98_percent_offer,
        p_add_name, p_add_date, p_modified_by, p_modified_on, p_is_active,
        NOW()
    )
    ON CONFLICT (company_code) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        dba_name = EXCLUDED.dba_name,
        ein = EXCLUDED.ein,
        address_line_1 = EXCLUDED.address_line_1,
        address_line_2 = EXCLUDED.address_line_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        country = EXCLUDED.country,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        contact_email = EXCLUDED.contact_email,
        is_authoritative_transmittal = EXCLUDED.is_authoritative_transmittal,
        is_agg_ale_group = EXCLUDED.is_agg_ale_group,
        cert_qualifying_offer = EXCLUDED.cert_qualifying_offer,
        cert_98_percent_offer = EXCLUDED.cert_98_percent_offer,
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        modified_by = EXCLUDED.modified_by,
        modified_on = EXCLUDED.modified_on,
        is_active = CASE 
            WHEN p_is_active IS NOT NULL THEN p_is_active 
            ELSE company_details.is_active 
        END, -- Update status if provided
        updated_at = NOW()
    RETURNING to_jsonb(company_details.*) INTO v_result;

    RETURN v_result;
END;
$$;
