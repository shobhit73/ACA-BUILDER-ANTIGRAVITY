
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
        envConfig[key] = value;
    }
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
    const testEmails = ['james.rodriguez@mailinator.com', 'mary.brown@mailinator.com', 'karen.smith@mailinator.com'];

    console.log("Checking profiles for:", testEmails);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('email', testEmails);

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log("Found profiles in 'public.profiles':", profiles);

    // Also check auth.users (if possible with service role)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Error listing auth users:", authError);
    } else {
        const foundAuthUsers = users.filter(u => testEmails.includes(u.email));
        console.log("Found users in 'auth.users':", foundAuthUsers.map(u => ({ id: u.id, email: u.email })));
    }
}

checkProfiles();
