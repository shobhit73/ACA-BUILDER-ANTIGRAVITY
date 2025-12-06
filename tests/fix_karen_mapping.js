
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

async function fixKaren() {
    console.log("Fixing Karen's Mapping...");
    const email = 'karen.smith@mailinator.com';

    // 1. Get User ID
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("Karen not found in Auth!");
        return;
    }
    console.log(`Found Karen: ${user.id}`);

    // 2. Insert Mapping
    const { error: insertError } = await supabase
        .from('user_company_mapping')
        .upsert({
            user_id: user.id,
            company_code: '202',
            role: 'employer_admin',
            is_active: true
        });

    if (insertError) {
        console.error("Error inserting mapping:", insertError);
    } else {
        console.log("✅ Successfully linked Karen to Company 202.");
    }

    // 3. Update Company Details to ensure modules is an array (if currently null)
    // Core modules are handled by Sidebar code now, but let's ensure add-ons are clean
    await supabase
        .from('company_details')
        .update({ modules: [] }) // Start empty or keep existing? Let's check existing first.
        .eq('company_code', '202')
        .is('modules', null);
}

fixKaren();
