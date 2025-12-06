
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env
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
const KEEP_EMAIL = "naveen@mailinator.com";

if (!supabaseKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetUsers() {
    console.log(`Starting User Reset. Preserving: ${KEEP_EMAIL}`);
    console.log("--------------------------------------------------");

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    let deletedCount = 0;
    let keptCount = 0;

    for (const user of users) {
        if (user.email === KEEP_EMAIL) {
            console.log(`[KEEP]   ${user.email} (${user.id})`);
            keptCount++;
        } else {
            console.log(`[DELETE] ${user.email} (${user.id}) ...`);
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.error(`  -> FAILED: ${deleteError.message}`);
            } else {
                console.log(`  -> DELETED`);
                deletedCount++;
            }
        }
    }

    console.log("--------------------------------------------------");
    console.log(`Reset Complete.`);
    console.log(`Deleted: ${deletedCount}`);
    console.log(`Kept:    ${keptCount}`);
}

resetUsers();
