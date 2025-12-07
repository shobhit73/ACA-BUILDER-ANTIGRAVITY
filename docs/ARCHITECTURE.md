# System Architecture

## Overview
This document outlines the technical architecture of the ACA-1095 Builder application. It is designed as a multi-tenant, role-based system for managing ACA compliance across multiple employer companies.

## 1. User Management & Authentication

The system uses **Supabase Auth** for identity management and a custom Role-Based Access Control (RBAC) implementation.

### Roles
- **System Admin**: 
    - Full access to all companies.
    - Can create companies, manage global settings, and view all raw data.
    - Controlled by `profiles.role = 'system_admin'`.
- **Employer Admin**:
    - Restricted to specific assigned companies.
    - Can manage employees, run reports, and view data ONLY for their assigned `company_code`.
    - Controlled by `user_company_mapping` table.
- **Employee**:
    - Restricted to their own single record.
    - Can only view/download their own 1095-C form.
    - Authenticated via email link or login.

### Data Isolation (Row Level Security)
Security is enforced at the database layer using PostgreSQL RLS policies.
- **`company_details`**: Users can only `SELECT` companies they are mapped to.
- **`employee_census`**: 
    - Employer Admins: Can view all rows where `company_code` matches their assignment.
    - Employees: Can only view rows where `employee_id` matches their own ID (via email lookup).

## 2. Module System

The application features a dynamic module system that allows System Admins to toggle features on a per-company basis.

### Implementation
- **Storage**: Modules are stored as a text array (`TEXT[]`) in the `company_details.modules` column.
- **Frontend Enforcement**: The `Sidebar` component (`components/layout/sidebar.tsx`) fetches the active modules for the current company and conditionally renders navigation items.
- **Available Modules**:
    - `import_data`: Access to upload CSVs.
    - `view_data`: Read-only access to census tables.
    - `generate_reports`: Ability to trigger ACA logic.
    - `aca_report`: View the monthly code matrix.
    - `pdf_1095c`: Download employee forms.
    - `pdf_1094c`: Download employer transmittal.
    - `plan_config`: Manage insurance plans.
    - `aca_penalties`: View penalty risk dashboard.
    - `manage_users`: Invite/manage portal users.

## 3. PDF Generation Pipeline

The system generates IRS-compliant PDFs securely on the server side using `pdf-lib`.

### 1095-C Generation
- **Route**: `/api/pdf-1095c`
- **Logic**: 
    1. Fetches employee census, address, and ACA monthly codes.
    2. Loads `public/forms/f1095c.pdf`.
    3. Maps database values to precise XFA form coordinates (e.g., `topmostSubform...f1_1`).
    4. Handles "All 12 Months" vs individual monthly logic.

### 1094-C Generation
- **Route**: `/api/pdf-1094c`
- **Logic**:
    1. Fetches company details and aggregated stats (e.g., total form count).
    2. Loads `f1094c.pdf`.
    3. Uses **Dynamic Field Mapping** to scan the PDF for short names (e.g., `f1_1[0]`) regardless of the internal generic XFA path.
    4. Iterates through 12 months to fill Part III (MEC Offer, Counts).
