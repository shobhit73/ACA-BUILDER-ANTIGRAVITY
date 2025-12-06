
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

async function checkDuplicates() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const COMPANY = '303'; // From screenshot

    console.log(`Checking duplicates for Company ${COMPANY}...`);

    const { data, error } = await supabase
        .from('employee_census')
        .select('employee_id, company_code')
        .eq('company_code', COMPANY);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const counts = {};
    const duplicates = [];

    data.forEach(row => {
        const key = row.employee_id;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] === 2) duplicates.push(key);
    });

    console.log(`Total Rows: ${data.length}`);
    console.log(`Duplicate IDs: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log("Sample Duplicates:", duplicates.slice(0, 5));
    } else {
        console.log("No duplicates found in Census.");
    }

    // Also check Status table for existing duplicates just in case deletion fails?
    // The script deletes before insert, so that should be clean.
}

checkDuplicates();
