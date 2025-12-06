
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    console.log("Testing connection to:", supabaseUrl);
    console.log("Querying company_details...");

    const { data, error, count } = await supabase
        .from("company_details")
        .select("*", { count: "exact" })
        .range(0, 9);

    if (error) {
        console.error("QUERY ERROR:", error);
    } else {
        console.log("SUCCESS! Found rows:", count);
        console.log("Data snippet:", JSON.stringify(data?.[0], null, 2));
    }
}

testQuery();
