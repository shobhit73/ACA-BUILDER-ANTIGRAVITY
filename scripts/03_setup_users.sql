-- ============================================================
-- QUICK SETUP: Create Admin & Test Tenant
-- ============================================================
-- Run this SQL in Supabase SQL Editor after running the main migrations
--
-- This creates:
-- 1. Admin user (naveen / naveen-123)
-- 2. Test tenant (Test Company)
-- 3. Test employer user (test@test.com / test123)
-- 4. Assigns ACA and Penalty Dashboard modules to test tenant
-- ============================================================

-- Step 1: Create Admin User
-- Email: naveen
-- Password: naveen-123
INSERT INTO users (email, password_hash, role, tenant_id, is_active)
VALUES (
  'naveen',
  -- This will be replaced by proper hash when user runs the helper
  'temp-hash-see-instructions-below',
  'admin',
  NULL,
  true
)
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash,
      is_active = EXCLUDED.is_active;

-- Step 2: Create Test Tenant
INSERT INTO tenants (id, name, contact_email, status)
VALUES (
  gen_random_uuid(),
  'Test Company',
  'admin@test.com',
  'active'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- ⚠️ IMPORTANT: Copy the tenant ID from above (or run this to get it):
-- SELECT id, name FROM tenants WHERE name = 'Test Company';

-- Step 3: Create Test Employer User
-- Replace <TENANT_ID_HERE> with the ID from Step 2
/*
INSERT INTO users (email, password_hash, role, tenant_id, is_active)
VALUES (
  'test@test.com',
  -- Hash for password 'test123'
  'temp-hash-see-instructions-below',
  'employer_admin',
  '<TENANT_ID_HERE>', -- ⚠️ REPLACE THIS!
  true
)
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash,
      tenant_id = EXCLUDED.tenant_id,
      is_active = EXCLUDED.is_active;
*/

-- Step 4: Assign Modules to Test Tenant
-- Replace <TENANT_ID_HERE> with the ID from Step 2
/*
INSERT INTO tenant_modules (tenant_id, module_name, is_enabled)
VALUES 
  ('<TENANT_ID_HERE>', 'aca', true),
  ('<TENANT_ID_HERE>', 'penalty_dashboard', true)
ON CONFLICT (tenant_id, module_name) DO UPDATE
  SET is_enabled = EXCLUDED.is_enabled;
*/

-- ============================================================
-- PASSWORD HASH GENERATION INSTRUCTIONS
-- ============================================================
--
-- The password hashes above are placeholders. To generate real hashes:
--
-- Option A: Use the helper API endpoint (RECOMMENDED)
-- --------------------------------------------------------
-- 1. Create app/api/admin/hash-password/route.ts:
--
--    import { NextRequest, NextResponse } from "next/server"
--    import { hashPassword } from "@/lib/auth"
--    
--    export async function POST(req: NextRequest) {
--      const { password } = await req.json()
--      const hash = await hashPassword(password)
--      return NextResponse.json({ hash })
--    }
--
-- 2. Call it via curl or browser:
--    curl -X POST http://localhost:3000/api/admin/hash-password \
--      -H "Content-Type: application/json" \
--      -d '{"password":"naveen-123"}'
--
-- 3. Copy the returned hash and update the SQL above
--
-- Option B: Use Node.js directly
-- --------------------------------------------------------
-- Run this in your terminal:
--
-- node -e "
-- const crypto = require('crypto');
-- const password = 'naveen-123';
-- const salt = crypto.randomBytes(16).toString('hex');
-- const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
-- console.log(salt + ':' + hash);
-- "
--
-- Then update the password_hash in the SQL above with the output
--
-- ============================================================
