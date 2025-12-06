
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkModules() {
    console.log("Checking modules for Company 202...");

    // 1. Check mapping
    const { data: mapping } = await supabase
        .from('user_company_mapping')
        .select('*')
        .eq('company_code', '202');

    console.log("User Mappings for 202:", mapping);

    // 2. Check modules
    const { data: modules, error } = await supabase
        .from('company_modules')
        .select('*')
        .eq('company_code', '202');

    if (error) console.error("Error fetching modules:", error);
    else console.log("Active Modules for 202:", modules);
}

checkModules();
