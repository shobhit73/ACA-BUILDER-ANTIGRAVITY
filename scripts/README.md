# Database Migration Scripts

This directory contains the consolidated database scripts for the ACA-1095 Builder application.
All legacy scripts have been merged into these 5 core files to ensure a single source of truth and simplify deployment.

## Consolidated File Structure

The scripts are numbered to be executed in order:

### 1. `001-core-schema.sql`
- **Purpose**: Defines the foundational database structure.
- **Contents**:
  - Core tables: `company_details`, `profiles` (extending Auth), `user_company_mapping`.
  - Business tables: `plan_master`, `employee_census`, `employee_address`, `employee_waiting_period`, `employee_plan_eligibility`, `employee_plan_enrollment`, `employee_dependent`, `plan_enrollment_cost`, `payroll_hours`.
  - Indexes and constraints used by the application.

### 2. `002-reporting-schema.sql`
- **Purpose**: Defines tables specifically for ACA reporting and generation.
- **Contents**:
  - `aca_employee_monthly_status`
  - `aca_employee_monthly_offer`
  - `aca_employee_monthly_enrollment`
  - `aca_final_report`
  - `aca_penalty_report`

### 3. `003-access-control.sql`
- **Purpose**: Manages security and access policies.
- **Contents**:
  - Helper functions: `is_system_admin()`, `has_company_access()`.
  - Row Level Security (RLS) policies for all core tables to separate multi-tenant data (by `company_code`).
  - Access grants for specific roles.

### 4. `004-consolidated-functions.sql`
- **Purpose**: Contains all Stored Procedures and Triggers.
- **Contents**:
  - **User Management**: `handle_new_user()` trigger for automated profile creation and role assignment.
  - **Data Import (Upserts)**: Robust `upsert_*` functions for bulk data loading (Census, Plans, Enrollment, etc.), handling conflicts and updates safely.
  - **ACA Logic**: 
    - `generate_aca_monthly_interim()`: V2 logic for calculating monthly codes based on census data.
    - `generate_aca_final_report()`: Generates 1095-C line codes (14, 15, 16).
    - `generate_aca_penalties()`: Calculates potential employer penalties.

### 5. `005-seed-data.sql`
- **Purpose**: Initial data population for testing and development.
- **Contents**:
  - Setup for test company (e.g., Company 202).
  - Setup for initial admin users (System Admin, Employer Admin).
  - Sample configurations.

## Usage

To initialize a fresh database, execute the scripts in numerical order (001 -> 005) in the Supabase SQL Editor.

## Legacy Scripts
All previous scripts (100-series patches, old 000-series fragments) have been consolidated into these files and deleted to maintain a clean workspace.
