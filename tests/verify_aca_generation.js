
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

async function verifyGeneration() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Check all relevant companies
    const companies = ['202', '303', '404'];
    const TAX_YEAR = 2025;

    console.log("==========================================");
    console.log(`Verifying ACA Data Generation for Tax Year ${TAX_YEAR}`);
    console.log("==========================================\n");

    for (const company of companies) {
        console.log(`Checking Company ${company}...`);

        // 1. Get Census Count
        const { count: censusCount, error: censusError } = await supabase
            .from('employee_census')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company);

        if (censusError) {
            console.error(`Error fetching census for ${company}:`, censusError.message);
            continue;
        }

        const expectedRows = censusCount * 12;

        // 2. Get Status Table Count
        const { count: statusCount, error: statusError } = await supabase
            .from('aca_employee_monthly_status')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company)
            .eq('tax_year', TAX_YEAR);

        // 3. Get Offer Table Count
        const { count: offerCount, error: offerError } = await supabase
            .from('aca_employee_monthly_offer')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company)
            .eq('tax_year', TAX_YEAR);

        // 4. Get Enrollment Table Count
        const { count: enrollmentCount, error: enrollmentError } = await supabase
            .from('aca_employee_monthly_enrollment')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company)
            .eq('tax_year', TAX_YEAR);

        // Report
        console.log(`  > Employees in Census: ${censusCount}`);
        console.log(`  > Expected Monthly Rows: ${expectedRows} (${censusCount} * 12)`);
        console.log(`  > Status Rows Found:     ${statusCount} [${statusCount === expectedRows ? 'OK' : 'MISMATCH'}]`);
        console.log(`  > Offer Rows Found:      ${offerCount} [${offerCount === expectedRows ? 'OK' : 'MISMATCH'}]`);
        console.log(`  > Enrollment Rows Found: ${enrollmentCount} [${enrollmentCount === expectedRows ? 'OK' : 'MISMATCH'}]`);

        if (statusCount === expectedRows && offerCount === expectedRows && enrollmentCount === expectedRows) {
            console.log(`  ✅ Company ${company} is FULLY PROCESSED.`);
        } else {
            console.error(`  ❌ Company ${company} has MISSING or DUPLICATE data.`);
        }
        console.log("");
    }
}

verifyGeneration();
