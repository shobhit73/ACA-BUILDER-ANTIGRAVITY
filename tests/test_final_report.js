
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

async function testFinalReport() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const COMPANY = '404';
    const YEAR = 2025;

    console.log(`Generating Final Report for ${COMPANY}/${YEAR}...`);

    const { data, error } = await supabase.rpc('generate_aca_final_report', {
        p_company_code: COMPANY,
        p_tax_year: YEAR
    });

    if (error) {
        console.error("Function Error:", error);
    } else {
        console.log("Function Result:", data);
    }

    // Now check if data exists in table
    const { count, error: countError } = await supabase
        .from('aca_final_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY)
        .eq('tax_year', YEAR);

    console.log(`Rows in aca_final_report: ${count} (Error: ${countError?.message})`);
}

testFinalReport();
