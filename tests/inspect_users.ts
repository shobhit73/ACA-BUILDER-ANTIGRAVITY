
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectUsers() {
    console.log("Fetching all users from auth.users...");

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${users.length} users.`);

    // Also fetch profiles to check database roles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error("Error fetching profiles:", profileError);
    }

    const report = users.map(u => ({
        id: u.id,
        email: u.email,
        profile_role: profiles?.find(p => p.id === u.id)?.role || 'none',
        metadata_role: u.user_metadata?.role
    }));

    console.log("Writing report to tests/users_list.json...");
    fs.writeFileSync(path.join(process.cwd(), 'tests', 'users_list.json'), JSON.stringify(report, null, 2));
    console.log("Done.");
}

inspectUsers();
