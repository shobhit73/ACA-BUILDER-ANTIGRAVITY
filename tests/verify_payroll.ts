
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

async function verifyPayrollUpsert() {
    console.log("Verifying Payroll Hours Upsert...")

    // Data from CSV Row 2: 
    // 202,1001,2025-01-01,2025-01-29,160.0,160.0,0.0,5000.0,1,System_Admin,2025-01-01
    const payload = {
        p_company_code: "202",
        p_employee_id: "1001",
        p_pay_period_start: "2025-01-01",
        p_pay_period_end: "2025-01-29",
        p_hours_worked: 160.0,
        p_regular_hours: 160.0, // This is the fixed field
        p_overtime_hours: 0.0,
        p_gross_wages: 5000.0,
        p_month: 1,
        p_add_name: "System_Admin",
        p_add_date: "2025-01-01",
        p_modified_by: null,
        p_modified_on: new Date().toISOString()
    }

    const { data, error } = await supabase.rpc('upsert_payroll_hours', payload)

    if (error) {
        console.error("RPC Failed:", error)
    } else {
        console.log("RPC Success:", data)

        // Verify Reading it back
        const { data: readData, error: readError } = await supabase
            .from('payroll_hours')
            .select('*')
            .eq('company_code', '202')
            .eq('employee_id', '1001')
            .eq('pay_period_start', '2025-01-01')
            .single()

        if (readError) console.error("Read Failed:", readError)
        else console.log("Read Verification:", readData)
    }
}

verifyPayrollUpsert()
