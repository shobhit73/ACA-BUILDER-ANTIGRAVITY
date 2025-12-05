-- Redefine upsert_company_details to ensure it exists
CREATE OR REPLACE FUNCTION upsert_company_details(
    p_company_code VARCHAR,
    p_company_name VARCHAR,
    p_dba_name VARCHAR DEFAULT NULL,
    p_ein VARCHAR DEFAULT NULL,
    p_address_line_1 VARCHAR DEFAULT NULL,
    p_address_line_2 VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_zip_code VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_contact_name VARCHAR DEFAULT NULL,
    p_contact_phone VARCHAR DEFAULT NULL,
    p_contact_email VARCHAR DEFAULT NULL,
    p_add_name VARCHAR DEFAULT NULL,
    p_add_date DATE DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_details (
        company_code, company_name, dba_name, ein, address_line_1, address_line_2,
        city, state, zip_code, country, contact_name, contact_phone, contact_email,
        add_name, add_date, updated_at
    ) VALUES (
        p_company_code, p_company_name, p_dba_name, p_ein, p_address_line_1, p_address_line_2,
        p_city, p_state, p_zip_code, p_country, p_contact_name, p_contact_phone, p_contact_email,
        p_add_name, p_add_date, NOW()
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
        add_name = EXCLUDED.add_name,
        add_date = EXCLUDED.add_date,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'company_code', p_company_code);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create Company Invites Table
CREATE TABLE IF NOT EXISTS company_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'company_admin',
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired
    invited_by UUID, -- user_id of the inviter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Index for invites
CREATE INDEX idx_company_invites_email ON company_invites(email);
CREATE INDEX idx_company_invites_company ON company_invites(company_code);

-- Function to upsert invite
CREATE OR REPLACE FUNCTION upsert_company_invite(
    p_company_code VARCHAR,
    p_email VARCHAR,
    p_role VARCHAR DEFAULT 'company_admin',
    p_invited_by UUID DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_invites (company_code, email, role, invited_by, updated_at)
    VALUES (p_company_code, p_email, p_role, p_invited_by, NOW())
    ON CONFLICT DO NOTHING; -- Simple insert for now, or could update status if re-invited
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
