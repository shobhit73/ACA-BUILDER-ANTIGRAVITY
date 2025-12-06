
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
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helpers from route.ts
function parseDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    return dateStr; // Sample data is already ISO or simple YYYY-MM-DD
}

function parseBoolean(value: string | undefined): boolean {
    if (!value) return false;
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "yes" || lower === "1" || lower === "y";
}

function parseBooleanYN(value: string | undefined): boolean {
    if (!value) return false;
    const upper = value.trim().toUpperCase();
    return upper === "Y" || upper === "YES" || upper === "TRUE";
}

async function runVerification() {
    console.log('Starting verification...');
    const sampleDir = path.resolve(process.cwd(), 'tests/sample_data');
    const files = fs.readdirSync(sampleDir);

    for (const file of files) {
        if (!file.endsWith('.csv')) continue;

        const filePath = path.join(sampleDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rowValues = lines[1].split(',').map(v => v.trim()); // Assume 1 row of data

        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
            row[h] = rowValues[i];
        });

        console.log(`Verifying ${file}...`);
        let result;

        try {
            switch (file) {
                case 'Company_Details.csv':
                    result = await supabase.rpc("upsert_company_details", {
                        p_company_code: row["company_code"],
                        p_company_name: row["company_name"],
                        p_dba_name: row["dba_name"] || null,
                        p_ein: row["ein"] || null,
                        p_address_line_1: row["address_line_1"] || null,
                        p_address_line_2: row["address_line_2"] || null,
                        p_city: row["city"] || null,
                        p_state: row["state"] || null,
                        p_zip_code: row["zip_code"] || null,
                        p_country: row["country"] || null,
                        p_contact_name: row["contact_name"] || null,
                        p_contact_phone: row["contact_phone"] || null,
                        p_contact_email: row["contact_email"] || null,
                        p_is_authoritative_transmittal: parseBoolean(row["is_authoritative_transmittal"]),
                        p_is_agg_ale_group: parseBoolean(row["is_agg_ale_group"]),
                        p_cert_qualifying_offer: parseBoolean(row["cert_qualifying_offer"]),
                        p_cert_98_percent_offer: parseBoolean(row["cert_98_percent_offer"]),
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;
                case 'Plan_Master.csv':
                    result = await supabase.rpc("upsert_plan_master", {
                        p_company_code: row["company_code"],
                        p_plan_code: row["plan_code"],
                        p_plan_name: row["plan_name"],
                        p_plan_type: row["plan_type"] || null,
                        p_mvc: parseBooleanYN(row["mvc"]),
                        p_me: parseBooleanYN(row["me"]),
                        p_plan_affordable_cost: row["plan_affordable_cost"] ? Number(row["plan_affordable_cost"]) : null,
                        p_option_emp: row["option_emp"] ? Number(row["option_emp"]) : null,
                        p_option_emp_spouse: row["option_emp_spouse"] ? Number(row["option_emp_spouse"]) : null,
                        p_option_emp_child: row["option_emp_child"] ? Number(row["option_emp_child"]) : null,
                        p_option_emp_family: row["option_emp_family"] ? Number(row["option_emp_family"]) : null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Census.csv':
                    result = await supabase.rpc("upsert_employee_census", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_first_name: row["first_name"],
                        p_middle_name: row["middle_name"] || null,
                        p_last_name: row["last_name"],
                        p_ssn: row["ssn"] || null,
                        p_date_of_birth: parseDate(row["date_of_birth"]),
                        p_gender: row["gender"] || null,
                        p_hire_date: parseDate(row["hire_date"]),
                        p_termination_date: parseDate(row["termination_date"]),
                        p_employment_status: row["employment_status"] || null,
                        p_job_title: row["job_title"] || null,
                        p_department: row["department"] || null,
                        p_full_time_equivalent: row["full_time_equivalent"] ? Number(row["full_time_equivalent"]) : null,
                        p_pay_frequency: row["pay_frequency"] || null,
                        p_employment_type_code: row["employment_type_code"] || null,
                        p_email: row["email"] || null,
                        p_employee_category: row["employee_category"] || null,
                        p_notes: row["notes"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Address.csv':
                    result = await supabase.rpc("upsert_employee_address", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_effective_date: parseDate(row["effective_date"]) || new Date().toISOString().split("T")[0],
                        p_address_line_1: row["address_line_1"] || null,
                        p_address_line_2: row["address_line_2"] || null,
                        p_city: row["city"] || null,
                        p_state: row["state"] || null,
                        p_zip_code: row["zip_code"] || null,
                        p_county: row["county"] || null,
                        p_country: row["country"] || null,
                        p_address_end_date: parseDate(row["address_end_date"]),
                        p_notes: row["notes"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Waiting_Period.csv':
                    result = await supabase.rpc("upsert_employee_waiting_period", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_plan_code: row["plan_code"] || null,
                        p_effective_date: parseDate(row["effective_date"]),
                        p_waiting_period_end_date: parseDate(row["waiting_period_end_date"]),
                        p_wait_period_days: row["wait_period_days"] ? Number(row["wait_period_days"]) : null,
                        p_is_waiting_period_waived: parseBoolean(row["is_waiting_period_waived"]),
                        p_waiver_reason: row["waiver_reason"] || null,
                        p_category_code: row["category_code"] || null,
                        p_benefit_class: row["benefit_class"] || null,
                        p_measurement_type: row["measurement_type"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Plan_Eligibility.csv':
                    result = await supabase.rpc("upsert_employee_plan_eligibility", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_plan_code: String(row["plan_code"]),
                        p_eligibility_start_date: parseDate(row["eligibility_start_date"]) || new Date().toISOString().split("T")[0],
                        p_eligibility_end_date: parseDate(row["eligibility_end_date"]),
                        p_eligibility_status: row["eligibility_status"] || "Active",
                        p_benefit_class: row["benefit_class"] || null,
                        p_measurement_type: row["measurement_type"] || null,
                        p_option_code: row["option_code"] || null,
                        p_plan_cost: row["plan_cost"] ? Number(row["plan_cost"]) : null,
                        p_category_code: row["category_code"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Plan_Enrollment.csv':
                    result = await supabase.rpc("upsert_employee_plan_enrollment", {
                        p_enrollment_id: row["enrollment_id"],
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_plan_code: String(row["plan_code"]),
                        p_enrollment_date: parseDate(row["enrollment_date"]) || new Date().toISOString().split("T")[0],
                        p_effective_date: parseDate(row["effective_date"]) || new Date().toISOString().split("T")[0],
                        p_termination_date: parseDate(row["termination_date"]),
                        p_coverage_tier: row["coverage_tier"] || null,
                        p_enrollment_status: row["enrollment_status"] || null,
                        p_enrollment_event: row["enrollment_event"] || null,
                        p_option_code: row["option_code"] || null,
                        p_category_code: row["category_code"] || null,
                        p_benefit_class: row["benefit_class"] || null,
                        p_measurement_type: row["measurement_type"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Employee_Dependent.csv':
                    result = await supabase.rpc("upsert_employee_dependent", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_dependent_id: row["dependent_id"],
                        p_first_name: row["first_name"],
                        p_middle_name: row["middle_name"] || null,
                        p_last_name: row["last_name"],
                        p_ssn: row["ssn"] || null,
                        p_date_of_birth: parseDate(row["date_of_birth"]),
                        p_gender: row["gender"] || null,
                        p_relationship: row["relationship"] || null,
                        p_is_disabled: parseBoolean(row["is_disabled"]),
                        p_enrollment_id: row["enrollment_id"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Plan_Enrollment_Cost.csv':
                    result = await supabase.rpc("upsert_plan_enrollment_cost", {
                        p_enrollment_id: row["enrollment_id"],
                        p_cost_period_start: parseDate(row["cost_period_start"]) || new Date().toISOString().split("T")[0],
                        p_cost_period_end: parseDate(row["cost_period_end"]) || new Date().toISOString().split("T")[0],
                        p_employee_cost: row["employee_cost"] ? Number(row["employee_cost"]) : null,
                        p_employer_cost: row["employer_cost"] ? Number(row["employer_cost"]) : null,
                        p_total_cost: row["total_cost"] ? Number(row["total_cost"]) : null,
                        p_coverage_id: row["coverage_id"] || null,
                        p_category_code: row["category_code"] || null,
                        p_benefit_class: row["benefit_class"] || null,
                        p_measurement_type: row["measurement_type"] || null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                        p_modified_by: row["modified_by"] || null,
                        p_modified_on: parseDate(row["modified_on"]),
                    });
                    break;

                case 'Payroll_Hours.csv':
                    result = await supabase.rpc("upsert_payroll_hours", {
                        p_company_code: row["company_code"],
                        p_employee_id: row["employee_id"],
                        p_pay_period_start: parseDate(row["pay_period_start"]) || new Date().toISOString().split("T")[0],
                        p_pay_period_end: parseDate(row["pay_period_end"]) || new Date().toISOString().split("T")[0],
                        p_hours_worked: row["hours_worked"] ? Number(row["hours_worked"]) : null,
                        p_regular_hours: row["regular_hours"] ? Number(row["regular_hours"]) : null,
                        p_overtime_hours: row["overtime_hours"] ? Number(row["overtime_hours"]) : null,
                        p_gross_wages: row["gross_wages"] ? Number(row["gross_wages"]) : null,
                        p_month: row["month"] ? Number(row["month"]) : null,
                        p_add_name: row["add_name"] || null,
                        p_add_date: parseDate(row["add_date"]),
                    });
                    break;
            }

            if (result && result.error) {
                console.error(`FAILED ${file}:`, result.error.message);
            } else if (result && result.data && result.data.success === false) {
                console.error(`FAILED ${file}:`, result.data.error || 'Unknown error');
            } else {
                console.log(`SUCCESS ${file}`);
            }

        } catch (e: any) {
            console.error(`EXCEPTION ${file}:`, e.message);
        }
    }
}

runVerification();
