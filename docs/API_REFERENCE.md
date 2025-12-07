# API Reference

This document details the backend API routes available in the ACA-1095 Builder.

## PDF Generation

### 1. Generate 1094-C (Employer Transmittal)
Generates the IRS Form 1094-C for a specific company and tax year.

- **Endpoint**: `GET /api/pdf-1094c`
- **Parameters**:
  - `companyCode` (Required): The unique identifier for the company (e.g., `C001`).
  - `taxYear` (Optional): The tax year for the form. Defaults to `2025`.
- **Response**: Returns a binary PDF stream (`application/pdf`) prompting a file download.
- **Access**: Employer Admin (for their own company) or System Admin.

### 2. Generate 1095-C (Employee Form)
Generates the IRS Form 1095-C for a specific employee.

- **Endpoint**: `GET /api/pdf-1095c`
- **Parameters**:
  - `companyCode` (Required): The company the employee belongs to.
  - `employeeId` (Required): The unique ID of the employee.
  - `taxYear` (Required): The tax year (e.g., `2024`).
- **Response**: Returns a binary PDF stream.
- **Access**: 
  - Employee (can only access their own).
  - Employer Admin (can access any employee in their company).

## Data Management

### 3. Upload Data
Handles the bulk upload of CSV files for census, plan, or enrollment data.

- **Endpoint**: `POST /api/upload`
- **Body**: `FormData` containing:
  - `file`: The CSV file binary.
  - `companyCode`: Target company.
  - `type`: Data type (`census`, `plan`, `enrollment`).
- **Response**: JSON object `{ success: true, count: 123 }`.

### 4. Delete Company Data
Wipes specific data types for a company to allow re-import.

- **Endpoint**: `POST /api/delete-data`
- **Body**: JSON
  ```json
  {
    "companyCode": "C001",
    "table": "employee_census"
  }
  ```

## Authentication

### 5. Create Employer Admin
Invites a new administrator for a specific company.

- **Action**: Server Action (not REST API) in `app/actions/er-admin-actions.ts`.
- **Function**: `inviteEmployerAdmin(formData)`
- **Behavior**:
  1. Creates auth user in Supabase.
  2. Creates profile in public table.
  3. Inserts into `user_company_mapping` with `is_primary=true`.
  4. User receives magic link/password reset email.
