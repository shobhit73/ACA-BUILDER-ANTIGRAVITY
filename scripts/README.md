
# Database Migration Scripts

This directory contains the SQL scripts used to build and maintain the application database.

## 🟢 Critical / Active Scripts
These scripts form the core of the current database schema.

| Script | Description | Status |
| :--- | :--- | :--- |
| `001-create-schema.sql` | Base Core Schema (Company Details, Employees, etc.) | **Base** |
| `002-create-stored-procedures.sql` | Base RPC Functions | **Base** |
| `003-update-schema.sql` | Schema updates (Phase 1) | Applied |
| `004-create-aca-interim-tables.sql` | ACA Reporting Tables | Applied |
| `006-fix-interim-generation-date-handling.sql` | Fix date handling | Applied |
| `008-update-interim-logic.sql` | Update logic | Applied |
| `009-create-aca-final-report.sql` | Final Report Tables | Applied |
| `011-create-penalty-report.sql` | Penalty Report Tables | Applied |
| `013-profiles-schema.sql` | **Profiles (User Roles)** Schema | **Active** |
| `014-rls-policies.sql` | Row Level Security Policies | Applied |
| `016-robust-import-schema.sql` | **Major Import System Upgrade** (Audit columns, RPCs) | **Active** |
| `017-add-company-status.sql` | Adds Active/Inactive to Company | **Active** |
| `019-create-company-module.sql` | **Company Modules** (Singular table name) and RLS | **Active** |
| `100-fix-infinite-recursion.sql` | Fixes RLS infinite loop bug | **Critical Fix** |
| `101-backfill-profiles.sql` | Backfills user profiles | Data Fix |
| `102-add-missing-constraints.sql` | Adds Unique Constraints to all import tables | **Critical Schema** |
| `104-fix-import-functions.sql` | **Import Fix** (Consolidated Import Functions) | **Critical Fix** |
| `105-fix-aca-generation.sql` | **ACA Report Fix** (Bypasses RLS for generation) | **Critical Fix** |
| `106-fix-profile-trigger.sql` | **Invite Fix** (Handles duplicate profiles) | **Critical Fix** |

## 🔴 Obsolete / Safe to Delete (Useless)
These scripts have been superseded by newer scripts or were temporary.

| Script | Reason for Deletion |
| :--- | :--- |
| `004-manage-company-schema.sql` | **CONFLICT:** Defines `company_modules` (plural), but the app uses `company_module` (singular) from script `019`. |
| `006-cleanup-functions.sql` | **SUPERSEDED:** Script `104` drops and recreates the functions this script tried to clean up. |
| `103-fix-payroll-upsert.sql` | **SUPERSEDED:** Merged into script `104`. |
| `016-cleanup.sql` | **OLD DUMP:** Superseded by `016-robust-import-schema.sql`. |

## 🟡 Historic / Archive (Keep for reference or delete if bold)
- `005-fix-and-multi-admin.sql`
- `007-drop-all-foreign-key-constraints.sql`
- `010-update-plan-master-schema.sql`
- `012-add-email-to-census.sql`
- `013-b-ensure-prerequisites.sql`
- `018-add-company-to-profiles.sql` (Likely patch for 013)
- `999-cleanup-schema.sql` (Utility to reset DB)
