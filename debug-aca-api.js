const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/['"]/g, '');
    }
});

const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);

async function testAPI() {
    const companyCode = '202'; // Assuming this is the company
    const taxYear = '2025';
    const limit = 50;

    console.log('--- Testing Page 1 ---');
    await fetchPage(1, companyCode, taxYear, limit);

    console.log('\n--- Testing Page 2 ---');
    await fetchPage(2, companyCode, taxYear, limit);

    console.log('\n--- Testing Search "2001" ---');
    await fetchPage(1, companyCode, taxYear, limit, '2001');
}

async function fetchPage(page, companyCode, taxYear, limit, search = '') {
    const offset = (page - 1) * limit;

    let query = supabase
        .from("aca_final_report")
        .select(
            `
            employee_id,
            month,
            line_14_code,
            employee_census!inner (
              first_name,
              last_name
            )
            `,
            { count: "exact" }
        )
        .eq("company_code", companyCode)
        .eq("tax_year", taxYear);

    if (search) {
        // Step 1: Find matching employees in census
        const { data: matchingEmployees } = await supabase
            .from('employee_census')
            .select('employee_id')
            .or(`employee_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
            .eq('company_code', companyCode);

        if (matchingEmployees && matchingEmployees.length > 0) {
            const empIds = matchingEmployees.map(e => e.employee_id);
            query = query.in('employee_id', empIds);
        } else {
            console.log(`Page ${page}, Search "${search}": Found 0 records (No matching employees).`);
            return;
        }
    }

    const { data, error, count } = await query
        .order("employee_id", { ascending: true })
        .order("month", { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Page ${page}, Search "${search}": Found ${count} records.`);
        if (data.length > 0) {
            console.log('First Record:', JSON.stringify(data[0], null, 2));
            console.log('Last Record:', JSON.stringify(data[data.length - 1], null, 2));
        } else {
            console.log('No data returned.');
        }
    }
}

testAPI();
