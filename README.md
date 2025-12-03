# ACA-1095 Builder - Complete Compliance System

A comprehensive Next.js application for managing IRS Form 1095-C compliance. This system handles data import, ACA code calculation, reporting, and automated PDF generation.

## 🚀 Key Features

### 1. Data Import System
- **Bulk Upload**: Support for 10 different CSV file types (Census, Plans, Enrollment, etc.)
- **Validation**: Real-time validation of required fields and data formats
- **Performance**: Batch processing with automatic retry logic
- **Progress Tracking**: Live status updates during upload

### 2. ACA Monthly Report Module
- **Automated Calculation**: Generates IRS codes (Line 14, 15, 16) based on employment and coverage data
- **Smart Logic**: Applies W-2 Safe Harbor, Federal Poverty Line, and Minimum Value rules
- **Matrix View**: Visual grid of codes for all employees across 12 months
- **Excel Export**: Download full reports for analysis

### 3. PDF 1095-C Generator
- **Automated Filling**: Populates IRS Form 1095-C with exact field coordinates
- **Complete Support**: Handles Part I (Employee/Employer), Part II (Codes), and Part III (Dependents)
- **Batch Generation**: Generate PDFs for individual employees or bulk download
- **Exact Mapping**: Uses `pdf-lib` to map database fields to the official IRS PDF template

### 4. Reporting & Analytics
- **Interim Reports**: Generate monthly status, offer, and enrollment tables
- **Data Viewer**: Master-detail view of all imported data tables
- **Stats Dashboard**: Quick insights into employee counts and system status

---

## 🛠️ Technical Architecture

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL), Stored Procedures (PL/pgSQL)
- **PDF Processing**: `pdf-lib` for server-side PDF manipulation
- **File Handling**: `papaparse` for CSV, `exceljs` for reports

### Database Schema
The system uses 10 core input tables and several processing tables:
- **Input**: `company_details`, `employee_census`, `employee_dependent`, `plan_master`, etc.
- **Interim**: `aca_employee_monthly_status`, `aca_employee_monthly_offer`, `aca_employee_monthly_enrollment`
- **Final**: `aca_final_report` (Stores calculated codes)

---

## 📦 Installation & Setup

1. **Prerequisites**: Node.js 18+, Supabase project
2. **Environment Variables**: Create `.env.local`
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
5. **Open Browser**: Navigate to `http://localhost:3000`

---

## 📖 Usage Guide

### Step 1: Import Data
1. Go to **Import Data**.
2. Upload required CSV files (Company, Census, Plans, Enrollment, etc.).
3. Ensure `Employee_Dependent` CSV includes `dependent_ssn` if applicable.

### Step 2: Generate Reports
1. Go to **Generate Reports**.
2. Select Company and Tax Year.
3. Click "Generate Interim Reports" to process raw data into monthly status tables.

### Step 3: Calculate Codes
1. Go to **ACA Report**.
2. Click "Generate Codes" to calculate Line 14/15/16 codes.
3. Review the matrix view or download the Excel report.

### Step 4: Download PDFs
1. Go to **1095-C PDFs**.
2. Select an employee from the **Employee Master List**.
3. Click "Download PDF".
   - **Note**: Part III (Dependents) will only populate for employees who have dependents in the database (e.g., check ID 1183).

---

## 📄 References

- **PDF Field Mapping**: See `PDF_FIELD_REFERENCE (1).md` for detailed coordinate mappings of the 1095-C form.
