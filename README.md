# ACA-1095 Builder - Complete Compliance System

A comprehensive Next.js application for managing IRS Form 1095-C compliance. This system handles data import, ACA code calculation, penalty analysis, reporting, and automated PDF generation.

## 🚀 Key Features

### 1. Data Import System
- **Bulk Upload**: Support for CSV file types (Census, Plans, Enrollment, etc.)
- **Validation**: Real-time validation of required fields and data formats
- **Performance**: Batch processing with automatic retry logic

### 2. ACA Monthly Report Module
- **Automated Calculation**: Generates IRS codes (Line 14, 15, 16) based on employment and coverage data
- **Smart Logic**: Applies W-2 Safe Harbor, Federal Poverty Line, and Minimum Value rules
- **Matrix View**: Visual grid of codes for all employees across 12 months

### 3. PDF 1095-C Generator
- **Automated Filling**: Populates IRS Form 1095-C with exact field coordinates
- **RBAC Integration**: Regular users can only access their own PDF
- **Batch Generation**: Generate PDFs for individual employees or bulk download

### 4. Penalty Analysis Dashboard
- **Risk Assessment**: Calculates potential Type A and Type B penalties
- **Visual Dashboard**: Displays total liability and breakdown by employee
- **Detailed Reports**: Drill down into specific penalty reasons per month

### 5. User Management & Security
- **Role-Based Access Control (RBAC)**: Distinct views for "System Admin", "Employer Admin", and "User"
- **Multi-Employer Support**: Full isolation of data between different companies
- **Dynamic Modules**: Configurable feature sets per company (e.g., toggle "ACA Penalties" or "Reports")
- **Secure Auth**: Supabase Authentication with secure password updates

---

## 🛠️ Technical Architecture

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL), Stored Procedures (PL/pgSQL)
- **PDF Processing**: `pdf-lib` for server-side PDF manipulation
- **File Handling**: `papaparse` for CSV, `exceljs` for reports

### Project Structure

```
├── app/
│   ├── aca-penalties/    # Penalty Dashboard
│   ├── aca-report/       # Monthly Code Generation
│   ├── api/              # Backend API Routes
│   ├── auth/             # Authentication Pages (Login, Update Password)
│   ├── pdf-1095c/        # PDF Generation Module
│   ├── settings/         # User & Company Management
│   └── page.tsx          # Root Redirect Logic
├── components/           # Reusable UI Components
│   ├── layout/           # Layout components (Sidebar, Navigation)
│   └── ui/               # Shadcn UI primitives
├── lib/                  # Utilities (Supabase Client, Helpers)
├── public/               # Static Assets (PDF Templates)
└── scripts/              # Database Migration Scripts
```

---

## 📦 Installation & Setup

1. **Prerequisites**: Node.js 18+, Supabase project
2. **Environment Variables**: Create `.env.local`
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
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

### Admin Workflow
1. **Import Data**: Upload Census and Plan data via the "Import Data" module.
2. **Generate Reports**: Run interim processing to populate monthly tables.
3. **Calculate Codes**: Generate ACA codes in the "ACA Report" module.
4. **Analyze Penalties**: Check the "ACA Penalties" dashboard for potential risks.
5. **Manage Users**: Invite employees to the portal via "Settings".

### Employee Workflow
1. **Login**: Access the portal via email invite.
2. **View PDF**: Automatically directed to the "1095-C PDFs" page.
3. **Download**: View and download their personal 1095-C form.

---

## 📄 References

- **PDF Field Mapping**: See `PDF_FIELD_REFERENCE.md` for detailed coordinate mappings of the 1095-C form.
