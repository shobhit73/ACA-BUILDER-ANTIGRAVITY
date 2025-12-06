
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load env
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
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
        return {};
    }
}

async function checkYears() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const COMPANY = '303';

    console.log(`Checking data dates for Company ${COMPANY}...`);

    // Get a sample of payroll dates
    const { data: payroll, error } = await supabase
        .from('payroll_hours')
        .select('pay_period_start')
        .eq('company_code', COMPANY)
        .limit(10);

    if (payroll && payroll.length > 0) {
        console.log("Sample Payroll Dates:", payroll.map(p => p.pay_period_start));
    } else {
        console.log("No payroll data found for 303.");
    }

    // Get a sample of census dates (hire dates)
    const { data: census } = await supabase
        .from('employee_census')
        .select('hire_date')
        .eq('company_code', COMPANY)
        .limit(10);

    if (census && census.length > 0) {
        console.log("Sample Hire Dates:", census.map(c => c.hire_date));
    }
}

checkYears();
