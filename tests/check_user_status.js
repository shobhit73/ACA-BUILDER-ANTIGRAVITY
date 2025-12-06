
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        });
        return env;
    } catch (e) { return {}; }
}

async function checkUser() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Email known to fail from screenshot
    const EMAIL = 'james.rodriguez@mailinator.com';

    console.log(`Checking status for: ${EMAIL}`);

    // 1. Check Profiles
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', EMAIL)
        .maybeSingle();

    if (pError) console.error("Profile check error:", pError);
    console.log("Profile Found:", profile ? "YES" : "NO", profile || "");

    // 2. Check Census
    const { data: census, error: cError } = await supabase
        .from('employee_census')
        .select('*')
        .eq('email', EMAIL)
        .maybeSingle();

    if (cError) console.error("Census check error:", cError);
    console.log("Census Found:", census ? "YES" : "NO", "User_ID link:", census?.user_id);

    // 3. Test Insert (Simulate Trigger Action)
    const fakeId = '00000000-0000-0000-0000-000000000000'; // Invalid UUID usually safe for test if valid format? 
    // Actually valid UUID v4 needed.
    const validFakeId = '123e4567-e89b-12d3-a456-426614174000';

    console.log("Attempting manual Profile Insert...");
    const { error: insertError } = await supabase.from('profiles').insert({
        id: validFakeId, // This might fail FK if id not in auth.users
        email: 'test_insert@example.com',
        role: 'employee',
        first_name: 'Test',
        last_name: 'User'
    });

    if (insertError) {
        console.error("Manual Insert Failed:", insertError);
        // Expected failure: FK constraint on auth.users(id).
        // If error is 'insert or update on table "profiles" violates foreign key constraint', then table is OK.
        // If error is 'permission denied', then that's the issue.
    } else {
        console.log("Manual Insert Success (Unexpected w/o Auth User) - Cleanup needed");
        await supabase.from('profiles').delete().eq('id', validFakeId);
    }
}

checkUser();
