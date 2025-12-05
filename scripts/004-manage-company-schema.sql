-- Create Company Modules Table
CREATE TABLE IF NOT EXISTS company_modules (
    company_code VARCHAR(50) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, module_code),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Create User Company Mapping Table
CREATE TABLE IF NOT EXISTS user_company_mapping (
    user_id UUID NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    role VARCHAR(50) DEFAULT 'company_admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, company_code),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_company_modules_company ON company_modules(company_code);
CREATE INDEX idx_user_company_mapping_user ON user_company_mapping(user_id);
CREATE INDEX idx_user_company_mapping_company ON user_company_mapping(company_code);

-- Upsert Company Module Function
CREATE OR REPLACE FUNCTION upsert_company_module(
    p_company_code VARCHAR,
    p_module_code VARCHAR,
    p_is_enabled BOOLEAN
) RETURNS JSON AS $$
BEGIN
    INSERT INTO company_modules (company_code, module_code, is_enabled, updated_at)
    VALUES (p_company_code, p_module_code, p_is_enabled, NOW())
    ON CONFLICT (company_code, module_code) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Upsert User Company Mapping Function
CREATE OR REPLACE FUNCTION upsert_user_company_mapping(
    p_user_id UUID,
    p_company_code VARCHAR,
    p_role VARCHAR DEFAULT 'company_admin'
) RETURNS JSON AS $$
BEGIN
    INSERT INTO user_company_mapping (user_id, company_code, role, updated_at)
    VALUES (p_user_id, p_company_code, p_role, NOW())
    ON CONFLICT (user_id, company_code) DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
