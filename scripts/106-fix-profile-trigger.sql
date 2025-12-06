
-- ====================================================================
-- Script: 106-fix-profile-trigger.sql
-- Purpose: Fix "Database error" on invite by handling duplicate profile inserts.
-- Status: ACTIVE / CRITICAL
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'employee'; -- Default role
    v_first_name TEXT;
    v_last_name TEXT;
    v_census_id UUID;
BEGIN
    BEGIN
        -- 1. Check if user exists in employee_census (Employee Persona)
        SELECT id, first_name, last_name INTO v_census_id, v_first_name, v_last_name
        FROM employee_census
        WHERE email = NEW.email
        LIMIT 1;

        IF v_census_id IS NOT NULL THEN
            -- Link user to census
            BEGIN
                UPDATE employee_census SET user_id = NEW.id WHERE id = v_census_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to update employee_census for user %: %', NEW.email, SQLERRM;
            END;
            v_role := 'employee';
            
            -- Use census names if available
            IF v_first_name IS NULL THEN v_first_name := NEW.raw_user_meta_data->>'first_name'; END IF;
            IF v_last_name IS NULL THEN v_last_name := NEW.raw_user_meta_data->>'last_name'; END IF;
        ELSE
            -- 2. Fallback to metadata
            v_first_name := NEW.raw_user_meta_data->>'first_name';
            v_last_name := NEW.raw_user_meta_data->>'last_name';
            
            IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
                v_role := 'system_admin';
            ELSIF NEW.raw_user_meta_data->>'role' = 'company_admin' THEN
                v_role := 'employer_admin';
            ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
                v_role := NEW.raw_user_meta_data->>'role';
            END IF;
        END IF;

        -- Upsert into profiles (Fixes duplicate key error if profile exists)
        INSERT INTO public.profiles (id, email, role, first_name, last_name, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            v_role,
            v_first_name,
            v_last_name,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
            updated_at = NOW();
            
    EXCEPTION WHEN OTHERS THEN
        -- Catch any error to ensure auth user creation doesn't fail
        RAISE WARNING 'Profile creation failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
