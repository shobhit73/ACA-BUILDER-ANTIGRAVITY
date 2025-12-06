-- Consolidated prerequisite script (Based on 004 and 005)

-- 1. Create Company Modules Table
CREATE TABLE IF NOT EXISTS company_modules (
    company_code VARCHAR(50) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (company_code, module_code),
    FOREIGN KEY (company_code) REFERENCES company_details(company_code) ON DELETE CASCADE
);

-- 2. Create User Company Mapping Table
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

-- Indexes for mapping
CREATE INDEX IF NOT EXISTS idx_company_modules_company ON company_modules(company_code);
CREATE INDEX IF NOT EXISTS idx_user_company_mapping_user ON user_company_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_mapping_company ON user_company_mapping(company_code);

-- 3. Create Company Invites Table
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

-- Indexes for invites
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_company ON company_invites(company_code);
