
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Simple .env parser since dotenv is not installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env: Record<string, string> = {};
        envFile.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });
        return env;
    } catch (error) {
        console.error('Error loading .env.local:', error);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPayrollCounts() {
    console.log("Checking Payroll Hours Counts...")

    // Check Total Count
    const { count: totalCount, error: totalError } = await supabase
        .from('payroll_hours')
        .select('*', { count: 'exact', head: true })

    if (totalError) console.error("Error fetching total count:", totalError)
    else console.log(`Total Payroll Hours Rows: ${totalCount}`)

    // Check Count for Company 202
    const { count: c202Count, error: c202Error } = await supabase
        .from('payroll_hours')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', '202')

    if (c202Error) console.error("Error fetching 202 count:", c202Error)
    else console.log(`Company 202 Payroll Hours Rows: ${c202Count}`)

    // Check Count for Company 404 (from screenshot)
    const { count: c404Count, error: c404Error } = await supabase
        .from('payroll_hours')
        .select('*', { count: 'exact', head: true })
        .eq('company_code', '404')

    if (c404Error) console.error("Error fetching 404 count:", c404Error)
    else console.log(`Company 404 Payroll Hours Rows: ${c404Count}`)
}

checkPayrollCounts()
