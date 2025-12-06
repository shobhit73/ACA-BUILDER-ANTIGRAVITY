
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

async function checkCompany202() {
    console.log("Checking Company 202 Details...");

    const { data: company, error } = await supabase
        .from('company_details')
        .select('*')
        .eq('company_code', '202')
        .single();

    if (error) console.error("Error fetching company:", error);
    else {
        console.log("Company 202 Modules:", company.modules);
        console.log("Is Array?", Array.isArray(company.modules));
    }
}

checkCompany202();
