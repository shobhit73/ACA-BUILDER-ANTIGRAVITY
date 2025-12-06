
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkMary() {
    const email = 'mary.brown@mailinator.com';
    console.log(`Checking status for ${email}...`);

    // 1. Check Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!authUser) {
        console.log("❌ User NOT FOUND in auth.users");
    } else {
        console.log("✅ User FOUND in auth.users:", { id: authUser.id, email: authUser.email });
    }

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, company_code')
        .ilike('email', email)
        .single();

    if (profileError) {
        console.log("❌ Profile NOT FOUND or Error:", profileError.message);
    } else {
        console.log("✅ Profile FOUND:", {
            email: profile.email,
            role: profile.role,
            company_code: profile.company_code
        });
    }

    // 3. Check Census
    const { data: census, error: censusError } = await supabase
        .from('employee_census')
        .select('email, first_name, last_name, company_code')
        .ilike('email', email)
        .single();

    if (censusError) {
        console.log("❌ Census NOT FOUND or Error:", censusError.message);
    } else {
        console.log("✅ Census FOUND:", census);
    }
}

checkMary();
