const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');

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
        const value = parts.slice(1).join('=').trim();
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const jwtSecret = envVars['JWT_SECRET'] || "your-secret-key-change-me";
const secretKey = new TextEncoder().encode(jwtSecret);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(":");
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === verifyHash;
}

async function main() {
    console.log("--- Starting Auth Debug ---");
    const email = 'naveen';
    const password = 'naveen-123'; // Assuming this is the password

    // 1. Login
    console.log(`1. Attempting login for ${email}...`);
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*, tenants(name)')
        .eq('email', email)
        .single();

    if (fetchError || !user) {
        console.error("Login failed: User not found or DB error", fetchError);
        return;
    }

    console.log("User found:", { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id });

    const isValid = await verifyPassword(password, user.password_hash);
    console.log("Password valid:", isValid);

    if (!isValid) return;

    // 2. Create Token
    console.log("2. Creating Token...");
    const token = await new SignJWT({
        user_id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secretKey);

    console.log("Token created:", token.substring(0, 20) + "...");

    // 3. Verify Token
    console.log("3. Verifying Token...");
    try {
        const { payload } = await jwtVerify(token, secretKey);
        console.log("Token verified. Payload:", payload);

        // 4. Fetch User Details (Simulating /api/auth/me)
        console.log("4. Fetching User Details (Simulating API)...");
        const { data: apiUser, error: apiError } = await supabase
            .from('users')
            .select(`
                id, 
                email, 
                role, 
                tenant_id,
                tenants (
                    name
                )
            `)
            .eq('id', payload.user_id)
            .single();

        if (apiError) {
            console.error("API Query Error:", apiError);
        } else {
            console.log("API User Result:", apiUser);
            const response = {
                user: {
                    id: apiUser.id,
                    email: apiUser.email,
                    role: apiUser.role,
                    tenant_id: apiUser.tenant_id,
                    name: apiUser.email.split('@')[0],
                    tenant_name: apiUser.tenants?.name || "System"
                }
            };
            console.log("Final Response:", response);
        }

    } catch (e) {
        console.error("Token verification failed:", e);
    }
}

main();
