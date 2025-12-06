
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
// Use Service Role Key to bypass RLS for this check
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log("Checking actual database counts (bypassing RLS)...");

    const tables = ["company_details", "plan_master", "profiles"];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });

        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else {
            console.log(`Table '${table}' has ${count} rows.`);
        }
    }
}

checkCounts();
