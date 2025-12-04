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

async function checkMultipleOffers() {
    console.log('--- Checking for Multiple Eligibility Records per Month ---');

    // Fetch all eligibility records
    const { data: eligibility, error } = await supabase
        .from('employee_plan_eligibility')
        .select('employee_id, benefit_class, plan_cost, eligibility_start_date, eligibility_end_date')
        .order('employee_id');

    if (error) {
        console.error('Error fetching eligibility:', error);
        return;
    }

    const empMap = {};

    eligibility.forEach(rec => {
        if (!empMap[rec.employee_id]) {
            empMap[rec.employee_id] = [];
        }
        empMap[rec.employee_id].push(rec);
    });

    let overlapCount = 0;
    const sampleOverlaps = [];

    // Check for overlaps
    for (const empId in empMap) {
        const records = empMap[empId];
        if (records.length < 2) continue;

        // Simple check: do any two records overlap in time?
        // And do they have different benefit_class?
        for (let i = 0; i < records.length; i++) {
            for (let j = i + 1; j < records.length; j++) {
                const r1 = records[i];
                const r2 = records[j];

                // Check time overlap
                const start1 = new Date(r1.eligibility_start_date);
                const end1 = r1.eligibility_end_date ? new Date(r1.eligibility_end_date) : new Date('2099-12-31');
                const start2 = new Date(r2.eligibility_start_date);
                const end2 = r2.eligibility_end_date ? new Date(r2.eligibility_end_date) : new Date('2099-12-31');

                if (start1 <= end2 && start2 <= end1) {
                    // Overlap!
                    if (r1.benefit_class !== r2.benefit_class) {
                        overlapCount++;
                        if (sampleOverlaps.length < 5) {
                            sampleOverlaps.push({
                                empId,
                                r1: { class: r1.benefit_class, cost: r1.plan_cost, start: r1.eligibility_start_date },
                                r2: { class: r2.benefit_class, cost: r2.plan_cost, start: r2.eligibility_start_date }
                            });
                        }
                    }
                }
            }
        }
    }

    console.log(`Found ${overlapCount} overlapping records with different benefit classes.`);
    if (sampleOverlaps.length > 0) {
        console.log('Sample Overlaps:', JSON.stringify(sampleOverlaps, null, 2));
    } else {
        console.log('No overlaps found where benefit_class differs.');
    }
}

checkMultipleOffers();
