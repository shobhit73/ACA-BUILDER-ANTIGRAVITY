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

async function debugACACodes() {
    console.log('--- ACA Code Analysis ---');

    // 1. Check distribution of Line 14 codes
    const { data: distribution, error: distError } = await supabase
        .from('aca_final_report')
        .select('line_14_code, line_16_code');

    if (distError) {
        console.error('Error fetching distribution:', distError);
    } else {
        const counts14 = {};
        const counts16 = {};
        distribution.forEach(r => {
            counts14[r.line_14_code] = (counts14[r.line_14_code] || 0) + 1;
            counts16[r.line_16_code] = (counts16[r.line_16_code] || 0) + 1;
        });
        console.log('Line 14 Code Distribution:', counts14);
        console.log('Line 16 Code Distribution:', counts16);
    }

    // 2. Inspect a sample of records
    console.log('\n--- Inspecting Sample Records (1A, 1B, 1E, 1H) ---');
    const { data: sample, error: sampleError } = await supabase
        .from('aca_final_report')
        .select(`
      employee_id, month, line_14_code, line_15_cost,
      aca_employee_monthly_offer!inner (
        plan_cost, benefit_class, offer_of_coverage,
        is_eligible_emp, is_eligible_family, emp_only_cost
      )
    `)
        .in('line_14_code', ['1A', '1B', '1E', '1H'])
        .limit(10);

    if (sampleError) {
        console.error('Error fetching sample:', sampleError.message);
    } else {
        sample.forEach(row => {
            console.log(`Emp: ${row.employee_id}, Month: ${row.month}`);
            console.log(`  Code: ${row.line_14_code}, Cost: ${row.line_15_cost}`);
            // @ts-ignore
            const offer = row.aca_employee_monthly_offer;
            console.log(`  Offer Data:`, {
                benefit: offer.benefit_class,
                emp_elig: offer.is_eligible_emp,
                fam_elig: offer.is_eligible_family,
                emp_cost: offer.emp_only_cost,
                plan_cost: offer.plan_cost
            });
        });
    }

    // 3. Check distinct benefit_class values
    console.log('\n--- Distinct Benefit Class Values ---');
    const { data: distinctBenefits, error: benefitError } = await supabase
        .from('aca_employee_monthly_offer')
        .select('benefit_class');

    if (benefitError) {
        console.error('Error fetching benefit classes:', benefitError);
    } else {
        const benefits = [...new Set(distinctBenefits.map(r => r.benefit_class))];
        console.log('Unique Benefit Classes found:', benefits);
    }

    // 4. Check Plan Master for MEC/MV
    console.log('\n--- Plan Master MEC/MV Check ---');
    const { data: plans, error: planError } = await supabase
        .from('plan_master')
        .select('plan_code, mvc, me');

    if (planError) {
        console.error('Error fetching plan master:', planError);
    } else {
        console.log('Plan Master Records:', plans);
    }

    // 5. Check Company Codes
    console.log('\n--- Company Codes & Tax Years ---');
    const { data: companies, error: companyError } = await supabase
        .from('employee_census')
        .select('company_code, hire_date');

    if (companyError) {
        console.error('Error fetching companies:', companyError);
    } else {
        const codes = [...new Set(companies.map(c => c.company_code))];
        console.log('Company Codes:', codes);
        // Estimate tax year from hire dates
        const years = [...new Set(companies.map(c => c.hire_date ? c.hire_date.substring(0, 4) : ''))];
        console.log('Hire Years:', years);
    }
    // 6. Inspect Raw Eligibility Data
    console.log('\n--- Raw Eligibility Data Sample ---');
    const { data: rawElig, error: rawError } = await supabase
        .from('employee_plan_eligibility')
        .select('*')
        .limit(5);

    if (rawError) {
        console.error('Error fetching raw eligibility:', rawError);
    } else {
        console.log('Raw Eligibility:', rawElig);
    }
    // 7. Check Option Codes
    console.log('\n--- Option Code Distribution ---');
    const { data: options, error: optError } = await supabase
        .from('employee_plan_eligibility')
        .select('option_code, benefit_class, plan_cost');

    if (optError) {
        console.error('Error fetching options:', optError);
    } else {
        const uniqueOptions = [...new Set(options.map(r => `${r.option_code} (${r.benefit_class})`))];
        console.log('Unique Option Codes:', uniqueOptions);
    }
    // 8. Check for Multiple Eligibility Records per Month
    console.log('\n--- Multiple Eligibility Check ---');
    const { data: multiElig, error: multiError } = await supabase
        .from('employee_plan_eligibility')
        .select('employee_id, eligibility_start_date, option_code, plan_cost')
        .order('employee_id, eligibility_start_date');

    if (multiError) {
        console.error('Error fetching multi eligibility:', multiError);
    } else {
        // Group by emp + month (approx)
        const counts = {};
        multiElig.forEach(r => {
            const key = `${r.employee_id}|${r.eligibility_start_date}`;
            if (!counts[key]) counts[key] = [];
            counts[key].push(r.option_code);
        });

        const multiples = Object.entries(counts).filter(([k, v]) => v.length > 1);
        console.log(`Found ${multiples.length} instances of multiple eligibility records.`);
        if (multiples.length > 0) {
            console.log('Sample:', multiples.slice(0, 3));
        } else {
            console.log('Sample single record:', Object.entries(counts).slice(0, 3));
        }
    }
}

debugACACodes();
