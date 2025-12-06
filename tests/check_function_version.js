
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

async function checkFunction() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking definition of generate_aca_monthly_interim...");

    const { data, error } = await supabase.rpc('generate_aca_monthly_interim', {
        p_company_code: 'TEST_CHECK',
        p_tax_year: 2025
    });

    // We expect it to run (and do nothing for TEST_CHECK).
    // But we can't easily see source code via RPC.
    // Instead, we check the return message.
    // My V1 Fixed script returns: "Generated successfully (V1 Fixed)"
    // The old script probably returns: "Generated successfully" or similar.

    if (error) {
        console.error("Function Error:", error);
    } else {
        console.log("Function Return:", data);
        if (data && data.message && data.message.includes("V1 Fixed")) {
            console.log("VERDICT: NEW Version is Active.");
        } else {
            console.log("VERDICT: OLD Version is Active.");
        }
    }
}

checkFunction();
