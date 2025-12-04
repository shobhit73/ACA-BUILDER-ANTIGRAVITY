const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function checkPK() {
    // We can't query information_schema directly via supabase-js client easily unless we have a view or RPC.
    // But we can try to insert a duplicate and see the error message, which often reveals the PK.

    // Or we can just try to fetch the definition if we had access.

    // Let's try to infer from the error of an upsert with wrong conflict target.
    const { error } = await supabase
        .from('plan_master')
        .upsert([
            { company_code: '202', plan_code: 'TEST_PK', plan_name: 'Test' }
        ], { onConflict: 'plan_code' }); // Try with plan_code first

    if (error) {
        console.log('Error with plan_code:', error.message);
    } else {
        console.log('Success with plan_code - PK might be just plan_code or upsert worked');
        // Clean up
        await supabase.from('plan_master').delete().eq('plan_code', 'TEST_PK');
    }
}

checkPK();
