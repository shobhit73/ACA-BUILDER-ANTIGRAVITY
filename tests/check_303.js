
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load env
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local'); // Adjusted path from tests/
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
            }
        });
        return env;
    } catch (e) {
        console.error("Error loading .env.local:", e);
        return {};
    }
}

async function checkCompany303() {
    const env = loadEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const COMPANY = '303';
    const YEAR = 2025;

    console.log(`Checking data for Company ${COMPANY} in Year ${YEAR}...`);

    // 1. Check Census
    const { count: censusCount, error: censusError } = await supabase
        .from('employee_census')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY);

    if (censusError) console.error("Census Error:", censusError);
    console.log(`- Census Rows: ${censusCount}`);

    // 2. Check Payroll
    const { count: payrollCount, error: payrollError } = await supabase
        .from('payroll_hours')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY)
        .gte('pay_period_start', `${YEAR}-01-01`)
        .lte('pay_period_start', `${YEAR}-12-31`);

    if (payrollError) console.error("Payroll Error:", payrollError);
    console.log(`- Payroll Rows (2025): ${payrollCount}`);

    // 3. Check Eligibility
    const { count: eligCount, error: eligError } = await supabase
        .from('employee_plan_eligibility')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY);

    if (eligError) console.error("Eligibility Error:", eligError);
    console.log(`- Eligibility Rows: ${eligCount}`);

    // 4. Check Interim Tables
    const { count: statusCount } = await supabase
        .from('aca_employee_monthly_status')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY)
        .eq('tax_year', YEAR);
    console.log(`- ACA Status Records (Interim): ${statusCount}`);

    const { count: reportCount } = await supabase
        .from('aca_report_final_data')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', COMPANY)
        .eq('tax_year', YEAR);
    console.log(`- Final Report Records: ${reportCount}`);
}

checkCompany303();
