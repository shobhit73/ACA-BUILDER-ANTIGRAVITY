
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

async function checkStatusDuplicates() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const COMPANY = '303';

    console.log(`Checking Status Table duplicates for Company ${COMPANY}...`);

    // We want to see if any (employee_id, month) pair appears > 1 time for Tax Year 2025
    const { data, error } = await supabase
        .from('aca_employee_monthly_status')
        .select('employee_id, month')
        .eq('company_code', COMPANY)
        .eq('tax_year', 2025);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const counts = {};
    const duplicates = [];

    data.forEach(row => {
        const key = `${row.employee_id}-${row.month}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] === 2) duplicates.push(key);
    });

    console.log(`Total Status Rows: ${data.length}`);
    console.log(`Duplicate (Emp-Month) Pairs: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log("Sample Duplicates:", duplicates.slice(0, 5));
    } else {
        console.log("No duplicates found in Status table.");
    }
}

checkStatusDuplicates();
