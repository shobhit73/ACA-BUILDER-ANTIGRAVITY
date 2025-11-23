const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
        }
    });

    const url = env['NEXT_PUBLIC_SUPABASE_URL'];
    const key = env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!url || !key) {
        console.error('Missing keys in .env.local');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    async function test() {
        console.log('Testing connection to:', url);
        try {
            // Try to fetch count from a table we know exists
            const { count, error } = await supabase.from('employee_details').select('*', { count: 'exact', head: true });
            
            if (error) {
                console.error('Supabase Error:', error.message);
                console.error('Details:', error);
            } else {
                console.log('Connection successful! Table "employee_details" is accessible.');
            }
        } catch (e) {
            console.error('Connection failed:', e.message);
        }
    }

    test();
} catch (err) {
    console.error('Error reading .env.local:', err.message);
}
