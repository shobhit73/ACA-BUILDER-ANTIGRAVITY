const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually read .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/['"]/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
    const { data, error } = await supabase.from('plan_master').select('*');
    if (error) {
        console.error(error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('First Plan:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No plans found');
        }
    }
}

checkPlans();
