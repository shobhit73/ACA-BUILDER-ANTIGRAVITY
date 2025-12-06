
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

async function checkOverlaps() {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Check 303 and 404
    const companies = ['303', '404'];

    for (const company of companies) {
        console.log(`Checking Eligibility Overlaps for Company ${company}...`);

        // Fetch all eligibility records
        const { data, error } = await supabase
            .from('employee_plan_eligibility')
            .select('employee_id, plan_code, eligibility_start_date, eligibility_end_date')
            .eq('company_code', company);

        if (error) {
            console.error("Error:", error);
            continue;
        }

        const employeeMap = {};
        let overlapCount = 0;

        // Group by employee
        data.forEach(row => {
            if (!employeeMap[row.employee_id]) employeeMap[row.employee_id] = [];
            employeeMap[row.employee_id].push(row);
        });

        // Check for overlaps for each employee
        for (const [empId, periods] of Object.entries(employeeMap)) {
            // Sort by start date
            periods.sort((a, b) => new Date(a.eligibility_start_date) - new Date(b.eligibility_start_date));

            for (let i = 0; i < periods.length - 1; i++) {
                const current = periods[i];
                const next = periods[i + 1];

                const currEnd = current.eligibility_end_date ? new Date(current.eligibility_end_date) : new Date('2099-12-31');
                const nextStart = new Date(next.eligibility_start_date);

                if (currEnd >= nextStart) {
                    // Overlap!
                    console.log(`Overlap found for ${company} / Emp ${empId}:`);
                    console.log(`  Record 1: ${current.eligibility_start_date} to ${current.eligibility_end_date}`);
                    console.log(`  Record 2: ${next.eligibility_start_date} to ${next.eligibility_end_date}`);
                    overlapCount++;
                }
            }
        }

        console.log(`Total Overlaps for ${company}: ${overlapCount}`);
    }
}

checkOverlaps();
