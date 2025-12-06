
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function checkCompanyAndInsert() {
    console.log("Checking Company 404...")

    // 1. Check if Company Exists
    const { data: company, error: companyError } = await supabase
        .from('company_details')
        .select('*')
        .eq('company_code', '404')
        .single()

    if (companyError || !company) {
        console.log("Company 404 NOT found in company_details.")
        console.log("Error details:", companyError?.message || "No data returned")
    } else {
        console.log("Company 404 Found:", company.company_name)
    }

    // 2. Try to Insert Payroll Row for 404
    console.log("\nAttempting to insert Payroll Row for 404...")
    const payload = {
        p_company_code: "404",
        p_employee_id: "1146", // From CSV line 1650
        p_pay_period_start: "2025-08-01",
        p_pay_period_end: "2025-08-29",
        p_hours_worked: 160.0,
        p_regular_hours: 160.0,
        p_overtime_hours: 0.0,
        p_gross_wages: 5000.0,
        p_month: 8,
        p_add_name: "System_Admin",
        p_add_date: "2025-01-01",
        p_modified_by: null,
        p_modified_on: new Date().toISOString()
    }

    const { data, error } = await supabase.rpc('upsert_payroll_hours', payload)

    if (error) {
        console.error("Insert Failed via RPC:", error.message)
    } else {
        console.log("Insert Success via RPC:", data)
    }
}

checkCompanyAndInsert()
