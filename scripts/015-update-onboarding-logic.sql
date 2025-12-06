-- Refine handle_new_user to support Dual Roles (Admin + Employee) prioritize Admin role but link Employee.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'employee'; -- Default
    v_first_name TEXT;
    v_last_name TEXT;
    v_census_id UUID;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- 1. Check metadata for explict role (e.g. from Invite or Admin creation)
    IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
        v_role := 'system_admin';
        v_is_admin := TRUE;
    ELSIF NEW.raw_user_meta_data->>'role' = 'company_admin' THEN
        v_role := 'employer_admin';
        v_is_admin := TRUE;
    END IF;

    -- 2. Check Company Invites (if not already determined)
    -- If email matches an accepted/pending invite in company_invites, grant admin role.
    -- (Assuming invite acceptance logic might happen here or pre-signup. For now, strict email match on invite table)
    IF NOT v_is_admin AND EXISTS (SELECT 1 FROM company_invites WHERE email = NEW.email) THEN
        v_role := 'employer_admin';
        v_is_admin := TRUE;
    END IF;

    -- 3. Check Employee Census (Always check this to link user_id)
    SELECT id, first_name, last_name INTO v_census_id, v_first_name, v_last_name
    FROM employee_census
    WHERE email = NEW.email
    LIMIT 1;

    IF v_census_id IS NOT NULL THEN
        -- Link user to census regardless of role
        UPDATE employee_census SET user_id = NEW.id WHERE id = v_census_id;
        
        -- If NOT an admin yet, they are definitely an employee
        IF NOT v_is_admin THEN
            v_role := 'employee';
        END IF;

        -- Use census names if metadata is missing
        IF v_first_name IS NULL THEN v_first_name := NEW.raw_user_meta_data->>'first_name'; END IF;
        IF v_last_name IS NULL THEN v_last_name := NEW.raw_user_meta_data->>'last_name'; END IF;
    ELSE
        -- No census record found.
        v_first_name := NEW.raw_user_meta_data->>'first_name';
        v_last_name := NEW.raw_user_meta_data->>'last_name';
    END IF;

    -- 4. Create Profile
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
