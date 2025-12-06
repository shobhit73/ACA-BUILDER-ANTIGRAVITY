-- Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT CHECK (role IN ('system_admin', 'employer_admin', 'employee')) DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id to employee_census if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employee_census' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE employee_census ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX idx_employee_census_user_id ON employee_census(user_id);
    END IF;
END $$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'employee'; -- Default role
    v_first_name TEXT;
    v_last_name TEXT;
    v_census_id UUID;
BEGIN
    -- 1. Check if user exists in employee_census (Employee Persona)
    SELECT id, first_name, last_name INTO v_census_id, v_first_name, v_last_name
    FROM employee_census
    WHERE email = NEW.email
    LIMIT 1;

    IF v_census_id IS NOT NULL THEN
        -- Link user to census
        UPDATE employee_census SET user_id = NEW.id WHERE id = v_census_id;
        v_role := 'employee';
        
        -- Use census names if available
        IF v_first_name IS NULL THEN v_first_name := NEW.raw_user_meta_data->>'first_name'; END IF;
        IF v_last_name IS NULL THEN v_last_name := NEW.raw_user_meta_data->>'last_name'; END IF;
    ELSE
        -- 2. Check if user exists in user_company_mapping (Employer Admin Persona)
        -- Note: Mapping might not exist yet if invite pending, but usually invite creates mapping placeholder?
        -- Actually, for now, we rely on metadata or invites.
        -- If an invite exists in company_invites with this email?
        -- For now, fallback to metadata or default employee.
        
        -- Check company_invites?
        -- If accepted invite logic is separate, we'll keep it simple here.
        
        v_first_name := NEW.raw_user_meta_data->>'first_name';
        v_last_name := NEW.raw_user_meta_data->>'last_name';
        
        -- If metadata says super_admin, honor it for now (safe transition)
        IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
            v_role := 'system_admin';
        ELSIF NEW.raw_user_meta_data->>'role' = 'company_admin' THEN
            v_role := 'employer_admin';
        END IF;
    END IF;

    -- Insert into profiles
    INSERT INTO public.profiles (id, email, role, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        v_first_name,
        v_last_name
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
