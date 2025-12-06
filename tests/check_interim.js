
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

async function checkInterim() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const COMPANY = '303';
    const YEAR = 2025;

    console.log("Checking tables for 303/2025...");

    const { count: status } = await supabase.from('aca_employee_monthly_status').select('*', { count: 'exact', head: true }).eq('company_code', COMPANY).eq('tax_year', YEAR);
    console.log(`STATUS rows: ${status}`);

    const { count: offer } = await supabase.from('aca_employee_monthly_offer').select('*', { count: 'exact', head: true }).eq('company_code', COMPANY).eq('tax_year', YEAR);
    console.log(`OFFER rows: ${offer}`);

    const { count: final } = await supabase.from('aca_report_final_data').select('*', { count: 'exact', head: true }).eq('company_code', COMPANY).eq('tax_year', YEAR);
    console.log(`FINAL rows: ${final}`);
}
checkInterim();
