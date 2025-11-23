-- ============================================================
-- SIMPLE DATABASE CHECK
-- ============================================================
-- Run this in Supabase SQL Editor to check if tables exist
-- ============================================================

-- Check if tenants table exists and show count
SELECT 
  'tenants' as table_name,
  COUNT(*) as row_count
FROM tenants;

-- Check if users table exists and show count
SELECT 
  'users' as table_name,
  COUNT(*) as row_count
FROM users;

-- If above works, youre good! If you get an error, run this:
-- ============================================================

/*
-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table  
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employer_admin', 'employer_user')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
*/
