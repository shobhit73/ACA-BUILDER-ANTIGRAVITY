
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

async function checkConstraints() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking constraints on aca_employee_monthly_offer...");

    // We can't easily query pg_constraint via API directly unless we have a function or RPC.
    // However, Supabase client prevents direct system catalog access usually.
    // I can assume I need to run a SQL command via 'write_to_file' then ask user, 
    // OR I can use a smart query if I have RLS bypass (service role).
    // Actually, I can use the 'rpc' to run arbitrary SQL if I had a 'exec_sql' function.
    // I don't.

    // But I can try to insert 2 rows explicitly and see if it fails.
    // If I insert Month 1 and Month 2 for same Employee.
    const TEST_EMP = 'TEST_CONST_001';

    // Cleanup first
    await supabase.from('aca_employee_monthly_offer').delete().eq('employee_id', TEST_EMP);

    // Insert Month 1
    const { error: e1 } = await supabase.from('aca_employee_monthly_offer').insert({
        company_code: 'TEST', employee_id: TEST_EMP, tax_year: 2099, month: 1,
        offer_of_coverage: false, eligible_for_coverage: false
    });
    if (e1) console.log("Insert Month 1 Error:", e1.message);
    else console.log("Insert Month 1: OK");

    // Insert Month 2
    const { error: e2 } = await supabase.from('aca_employee_monthly_offer').insert({
        company_code: 'TEST', employee_id: TEST_EMP, tax_year: 2099, month: 2,
        offer_of_coverage: false, eligible_for_coverage: false
    });
    if (e2) console.log("Insert Month 2 Error:", e2.message);
    else console.log("Insert Month 2: OK");

    // Cleanup
    await supabase.from('aca_employee_monthly_offer').delete().eq('employee_id', TEST_EMP);
}

checkConstraints();
