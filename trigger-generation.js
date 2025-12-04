const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple .env parser
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerGeneration() {
    console.log('--- Triggering ACA Report Generation ---');

    // We can call the RPC directly since we have the client
    // This bypasses the API route but tests the DB logic directly

    const companyCode = '202'; // Correct company code from DB
    const taxYear = 2025;

    console.log(`Generating for ${companyCode} / ${taxYear}...`);

    const { data: interimData, error: interimError } = await supabase.rpc('generate_aca_monthly_interim', {
        p_company_code: companyCode,
        p_tax_year: taxYear
    });

    if (interimError) {
        console.error('Error generating interim:', interimError);
        return;
    }
    console.log('Interim Generation Result:', interimData);

    const { data: finalData, error: finalError } = await supabase.rpc('generate_aca_final_report', {
        p_company_code: companyCode,
        p_tax_year: taxYear
    });

    if (finalError) {
        console.error('Error generating final report:', finalError);
        return;
    }
    console.log('Final Report Generation Result:', finalData);
}

triggerGeneration();
