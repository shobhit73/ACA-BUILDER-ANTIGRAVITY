-- Backfill Profiles from Auth.Users
-- The 'profiles' table is used for permission checks (RLS).
-- If it's empty, no one has access to anything.
-- This script syncs existing users from auth.users into profiles.

INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'first_name', 'System'), 
    COALESCE(raw_user_meta_data->>'last_name', 'Admin'),
    'system_admin' -- Forcing System Admin for ALL current users to unblock access immediately. 
                   -- In a real prod env, we'd be more selective, but here we need to fix the dev env.
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id);

-- Verify
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.profiles;
    RAISE NOTICE 'Profiles table now has % rows.', v_count;
END $$;
