const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env.local:', e.message);
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim(); // Handle values with =
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys in .env.local');
    console.log('Found keys:', Object.keys(envVars));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'naveen';
    // Hash for 'naveen-123'
    const passwordHash = '4a63542708f4eb375bcb29c5dbd68b1e:2b1d4a158d95fa1376eefd4c61b93fb7bd95097794e9ab40b2fa2bf5de6063caada49227eb2fee0ef14a2df2e53e91bff0e41c664ff582a337497f5e2e97b3d4';

    console.log(`Checking for user: ${email}...`);

    // Check if user exists
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (fetchError) {
        console.error('Error fetching user:', fetchError);
        return;
    }

    if (users && users.length > 0) {
        console.log('User "naveen" already exists.');
        // Update password just in case
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: passwordHash, is_active: true, role: 'admin' })
            .eq('email', email);

        if (updateError) console.error('Error updating user:', updateError);
        else console.log('User "naveen" updated successfully.');
    } else {
        console.log('User "naveen" does not exist. Creating...');
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                email: email,
                password_hash: passwordHash,
                role: 'admin',
                is_active: true
            });

        if (insertError) console.error('Error creating user:', insertError);
        else console.log('User "naveen" created successfully.');
    }
}

main();
