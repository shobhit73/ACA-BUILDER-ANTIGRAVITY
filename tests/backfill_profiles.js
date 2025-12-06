
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function backfillProfiles() {
    console.log("Fetching all auth users...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${users.length} users in Auth. Checking profiles...`);

    let updatedCount = 0;
    let createdCount = 0;

    for (const user of users) {
        if (!user.email) continue;

        // Check if profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, company_code, first_name, last_name')
            .eq('id', user.id)
            .single();

        // Check census for info
        const { data: census } = await supabase
            .from('employee_census')
            .select('first_name, last_name, company_code')
            .ilike('email', user.email) // Case-insensitive match
            .single();

        if (profile) {
            // Debug check for Karen or Mary
            if (user.email.includes('karen.smith') || user.email.includes('mary.brown')) {
                console.log(`DEBUG Check for ${user.email}: Profile names='${profile.first_name} ${profile.last_name}', Census names='${census?.first_name} ${census?.last_name}'`);
            }

            const updates = {};

            // 1. Backfill Company Code
            if ((!profile.company_code || profile.company_code === null) && census?.company_code) {
                updates.company_code = census.company_code;
            }

            // 2. Backfill First Name
            if (!profile.first_name && census?.first_name) {
                updates.first_name = census.first_name;
            }

            // 3. Backfill Last Name
            if (!profile.last_name && census?.last_name) {
                updates.last_name = census.last_name;
            }

            if (Object.keys(updates).length > 0) {
                console.log(`Updating missing data for ${user.email}:`, updates);
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);

                if (updateError) console.error(`Failed to update profile:`, updateError);
                else {
                    console.log("Successfully updated profile data.");
                    updatedCount++;
                }
            } else {
                console.log(`Profile exists for ${user.email} (${user.id}). No update needed.`);
            }
            continue;
        }

        console.log(`Missing profile for ${user.email}. Creating...`);

        const firstName = user.user_metadata?.first_name || census?.first_name || 'Unknown';
        const lastName = user.user_metadata?.last_name || census?.last_name || 'User';
        const companyCode = user.user_metadata?.company_code || census?.company_code || null;
        const role = user.user_metadata?.role || (user.email.includes('admin') ? 'system_admin' : 'employee');

        // Insert Profile
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email.toLowerCase(),
                first_name: firstName,
                last_name: lastName,
                company_code: companyCode,
                role: role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (insertError) {
            console.error(`Failed to create profile for ${user.email}:`, insertError);
        } else {
            console.log(`Created profile for ${user.email} with company_code=${companyCode}`);
            createdCount++;
        }
    }

    console.log(`Backfill Complete. Created: ${createdCount}, Updated: ${updatedCount}`);
}

backfillProfiles();
