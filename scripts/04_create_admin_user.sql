-- ============================================================
-- COMPLETE SETUP: Admin User & Test Data
-- ============================================================
-- Run this in Supabase SQL Editor AFTER running:
-- 1. scripts/01_multitenant_migration.sql
-- 2. scripts/02_multitenant_stored_procedures.sql
-- ============================================================

-- Step 1: Create Admin User
-- Email: naveen
-- Password: naveen-123
INSERT INTO users (email, password_hash, role, tenant_id, is_active)
VALUES (
  'naveen',
  '4a63542708f4eb375bcb29c5dbd68b1e:2b1d4a158d95fa1376eefd4c61b93fb7bd95097794e9ab40b2fa2bf5de6063caada49227eb2fee0ef14a2df2e53e91bff0e41c664ff582a337497f5e2e97b3d4',
  'admin',
  NULL,
  true
)
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash,
      is_active = EXCLUDED.is_active;

-- Verify admin was created
SELECT id, email, role, is_active FROM users WHERE email = 'naveen';

-- ============================================================
-- DONE! You can now login with:
-- Email: naveen
-- Password: naveen-123
-- ============================================================
