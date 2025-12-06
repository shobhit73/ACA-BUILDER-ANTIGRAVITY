
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

async function checkPlanDuplicates() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking plan_master for duplicate plan_codes...");

    const { data, error } = await supabase
        .from('plan_master')
        .select('plan_code');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const counts = {};
    data.forEach(row => {
        counts[row.plan_code] = (counts[row.plan_code] || 0) + 1;
    });

    let duplicatesFound = false;
    for (const [code, count] of Object.entries(counts)) {
        if (count > 1) {
            console.log(`DUPLICATE: Plan Code '${code}' appears ${count} times.`);
            duplicatesFound = true;
        }
    }

    if (!duplicatesFound) {
        console.log("No duplicates found in plan_master.");
    }
}

checkPlanDuplicates();
