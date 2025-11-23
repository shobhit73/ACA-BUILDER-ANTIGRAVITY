# 🏥 ACA-1095 Builder - Employee Census & ACA Compliance System

A comprehensive employee census management system that automatically calculates ACA (Affordable Care Act) compliance codes for IRS Form 1095-C reporting.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Data Flow](#data-flow)
- [ACA Code Logic](#aca-code-logic)
- [Excel File Format](#excel-file-format)
- [API Endpoints](#api-endpoints)
- [Scaling Strategy](#scaling-strategy)
- [Getting Started](#getting-started)

## 🎯 Overview

This system helps employers comply with ACA reporting requirements by:
1. Processing employee census data from Excel files
2. Calculating monthly eligibility and enrollment status
3. Automatically determining IRS Form 1095-C codes (Line 14 & Line 16)
4. Generating penalty reports for non-compliance
5. Providing downloadable reports for filing

## ✨ Key Features

### 📤 Census Data Upload
- Upload Excel files with employee demographic, eligibility, enrollment, and dependent data
- Flexible column name recognition (handles different Excel formats)
- Automatic date parsing (Excel serial dates, ISO dates, string dates)
- Data deduplication and validation

### 📊 Automated Processing
- **Daily tables**: Employee status, eligibility, and enrollment for each day
- **Monthly tables**: Aggregated monthly views for compliance reporting
- **ACA codes**: Automatic calculation of Line 14 (Offer of Coverage) and Line 16 (Safe Harbor)

### 💰 Penalty Dashboard
- Visual dashboard showing employees who trigger penalties
- Two penalty types:
  - **Penalty A** ($241.67/month): No coverage offered to full-time employee
  - **Penalty B** ($362.50/month): Unaffordable coverage offered
- Filter by department
- Click-to-filter by penalty type
- Monthly breakdown of penalties

### 📥 Export Capabilities
- Download all processed tables as Excel
- Export ACA monthly report as CSV
- Ready for IRS filing

## 🏗️ System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  • Upload Page (/)                                               │
│  • Penalty Dashboard (/aca/penalty-dashboard)                   │
│  • Download Reports                                              │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                       API ROUTES                                 │
├─────────────────────────────────────────────────────────────────┤
│  • POST /api/upload - Upload and process Excel                  │
│  • GET /api/download-tables - Download all tables               │
│  • GET /api/download-aca - Download ACA report                  │
│  • GET /api/penalty-dashboard - Generate penalty data           │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
├─────────────────────────────────────────────────────────────────┤
│  BASE TABLES (Excel data):                                      │
│  • Emp_Demographic                                               │
│  • Emp_Eligibility                                               │
│  • Emp_Enrollment                                                │
│  • Dep_Enrollment                                                │
│  • employee_details                                              │
│                                                                   │
│  DERIVED TABLES (calculated):                                    │
│  • employee_status_daily / _monthly                             │
│  • eligibility_daily / _monthly                                  │
│  • enrollment_daily / _monthly                                   │
│  • dependent_enrollment_daily / _monthly                        │
│  • employee_aca_monthly (Line 14 & 16 codes)                    │
│                                                                   │
│  STORED PROCEDURES:                                              │
│  • refresh_employee_status(year)                                │
│  • refresh_eligibility(year)                                     │
│  • refresh_enrollment(year)                                      │
│  • refresh_dependent_enrollment(year)                           │
│  • refresh_employee_aca(year)                                   │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## 🗄️ Database Schema

### Base Tables (Excel Data)

#### Emp_Demographic
Stores employee demographic information and employment status changes.
\`\`\`sql
- employeeid: INT (employee identifier)
- statusstartdate: DATE (when this status period began)
- statusenddate: DATE (when this status period ended)
- role: TEXT ("FT" = Full-Time, "PT" = Part-Time)
- employmentstatus: TEXT ("Active", "LOA", "Terminated")
\`\`\`

#### employee_details
Stores detailed employee information (name, address, SSN, etc.)
\`\`\`sql
- employee_id: INT (primary key)
- first_name, middle_initial, last_name: TEXT
- ssn, address_line1, city, state, zip_code: TEXT
- employer_name, ein, employer_address: TEXT
- employee_category: TEXT (department/division)
\`\`\`

#### Emp_Eligibility
Stores eligibility periods for health insurance coverage.
\`\`\`sql
- employeeid: INT
- eligibilitystartdate, eligibilityenddate: DATE
- eligibleplan: TEXT ("PlanA", "PlanB", etc.)
- eligibletier: TEXT ("EMP", "EMPFAM", "EMPSPOUSE", "EMPCHILD")
- plancost: NUMERIC (monthly cost for employee)
\`\`\`

#### Emp_Enrollment
Stores actual enrollment in health insurance plans.
\`\`\`sql
- employeeid: INT
- enrollmentstartdate, enrollmentenddate: DATE
- plancode: TEXT ("PlanA", "PlanB", "Waive")
- tier: TEXT ("EMP", "EMPFAM", etc.)
\`\`\`

#### Dep_Enrollment
Stores dependent enrollment information.
\`\`\`sql
- employeeid, dependentid: INT
- depfirstname, deplastname, deprelcode: TEXT
- enrollmentstartdate, enrollmentenddate: DATE
- dependentrelationship: TEXT ("Spouse", "Child")
- plancode, planname: TEXT
\`\`\`

### Derived Tables (Calculated)

#### employee_status_monthly
Monthly summary of employment status.
\`\`\`sql
- employee_id: TEXT, month_start: DATE
- is_employed_full_month: BOOLEAN
- is_full_time_full_month: BOOLEAN
- is_part_time_full_month: BOOLEAN
\`\`\`

#### eligibility_monthly
Monthly summary of health insurance eligibility.
\`\`\`sql
- employee_id: TEXT, month_start: DATE
- eligible_plans, eligible_tiers: TEXT
- plan_cost: NUMERIC
- employee_eligible_full_month: BOOLEAN
- spouse_eligible_full_month, child_eligible_full_month: BOOLEAN
\`\`\`

#### enrollment_monthly
Monthly summary of health insurance enrollment.
\`\`\`sql
- employee_id: TEXT, month_start: DATE
- plancode, tier: TEXT
- employee_enrolled: BOOLEAN
- spouse_enrolled, child_enrolled: BOOLEAN
\`\`\`

#### employee_aca_monthly
ACA compliance codes for IRS Form 1095-C.
\`\`\`sql
- employee_id: TEXT, month_start: DATE
- line_14: TEXT (Offer of Coverage code)
- line_16: TEXT (Safe Harbor code)
\`\`\`

## 🔄 Data Flow

1. **Upload Excel File** → Frontend sends file to `/api/upload`
2. **Parse Excel** → Extract data from 4 sheets
3. **Clear Base Tables** → Delete existing data for the year
4. **Insert Base Tables** → Load new data from Excel
5. **Call DB Functions** → Trigger stored procedures to rebuild derived tables:
   - `refresh_employee_status(2025)` → Expands date ranges into daily/monthly status
   - `refresh_eligibility(2025)` → Expands eligibility into daily/monthly rows
   - `refresh_enrollment(2025)` → Expands enrollment into daily/monthly rows
   - `refresh_dependent_enrollment(2025)` → Processes dependent coverage
   - `refresh_employee_aca(2025)` → Calculates Line 14 and Line 16 codes
6. **Return Success** → API returns row counts to frontend
7. **View Dashboard** → Users can view penalty dashboard or download reports

## 📜 ACA Code Logic

### Line 14: Offer of Coverage

Determines what type of coverage was offered to the employee.

| Code | Description | Logic |
|------|-------------|-------|
| **1A** | Qualifying Offer | Full-time + both EMP and EMPFAM tiers offered + EMP cost ≤ $50 |
| **1E** | Non-Affordable | Full-time + both EMP and EMPFAM tiers offered + EMP cost > $50 |
| **1B** | Employee Only | Full-time + coverage offered to employee only |
| **1C** | Employee + Children | Full-time + coverage offered to employee and children only |
| **1D** | Employee + Spouse | Full-time + coverage offered to employee and spouse only |
| **1F** | MEC without MV | Full-time + other plan offered (not PlanA) |
| **1G** | Not Full-Time Enrolled | Not full-time for full month (regardless of enrollment) |
| **1H** | No Offer | Full-time + no coverage offered |

### Line 16: Safe Harbor

Provides a safe harbor code to avoid penalties.

| Code | Description | Logic |
|------|-------------|-------|
| **NULL** | No Code | Line 14 is 1A (qualifying offer, no safe harbor needed) |
| **2C** | Enrolled | Enrolled in coverage for entire month (any employment status) |
| **2A** | Not Employed | Not employed or not employed for full month |
| **2B** | Not Full-Time | Not full-time for full month and not enrolled |
| **2F** | Affordable Offer | Full-time + not enrolled + EMP cost ≤ $50 (W-2 safe harbor) |
| **2H** | Unaffordable Offer | Full-time + not enrolled + EMP cost > $50 (rate-of-pay safe harbor) |

### Key Edge Cases Handled

1. **Mid-Month Plan Changes**: Employee switches from PlanA to PlanB mid-month
   - Solution: Check `enrollment_daily` to count days covered, not just monthly status
   
2. **Multiple Tiers per Month**: Employee has both EMP and EMPFAM eligibility
   - Solution: Use COUNT(DISTINCT CASE...) to check if both tiers exist
   
3. **Line 14 = 1A → Line 16 = NULL**: When offering affordable coverage to employee + family
   - Solution: Check for 1A conditions first, return NULL before other safe harbors

## 📄 Excel File Format

### Required Sheets

Your Excel file must contain exactly 4 sheets with these names:

#### Sheet 1: "Emp Demographic"
Employee demographic information and status periods.

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| employeeid | ✅ | Unique employee ID | 1001 |
| firstname | ✅ | First name | Jane |
| lastname | ✅ | Last name | Doe |
| statusstartdate | ✅ | Start of status period | 1/1/2025 |
| statusenddate | Optional | End of status period | 12/31/2025 |
| role | ✅ | FT or PT | FT |
| employmentstatus | ✅ | Active, LOA, Terminated | Active |
| ssn | Optional | Social Security Number | 123-45-6789 |
| address_line1 | Optional | Street address | 123 Main St |
| city | Optional | City | Springfield |
| state | Optional | State | IL |
| zipcode | Optional | ZIP code | 62701 |
| employee_category | Optional | Department | Sales |

#### Sheet 2: "Emp Eligibility"
Eligibility periods for health insurance.

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| employeeid | ✅ | Employee ID | 1001 |
| eligibilitystartdate | ✅ | Start of eligibility | 1/1/2025 |
| eligibilityenddate | Optional | End of eligibility | 12/31/2025 |
| eligibleplan | ✅ | Plan code | PlanA |
| eligibletier | ✅ | Coverage tier | EMP or EMPFAM |
| plancost | ✅ | Monthly cost | 50.00 |

**Coverage Tiers:**
- **EMP**: Employee only
- **EMPFAM**: Employee + Family
- **EMPSPOUSE**: Employee + Spouse
- **EMPCHILD**: Employee + Children

#### Sheet 3: "Emp Enrollment"
Actual enrollment in health insurance.

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| employeeid | ✅ | Employee ID | 1001 |
| enrollmentstartdate | ✅ | Start of enrollment | 1/1/2025 |
| enrollmentenddate | Optional | End of enrollment | 12/31/2025 |
| plancode | ✅ | Plan enrolled in | PlanA or Waive |
| tier | ✅ | Coverage tier | EMPFAM |

**Plan Codes:**
- **PlanA, PlanB, etc.**: Enrolled in coverage
- **Waive**: Employee declined coverage

#### Sheet 4: "Dep Enrollment"
Dependent enrollment in health insurance.

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| employeeid | ✅ | Employee ID | 1001 |
| dependentid | ✅ | Dependent ID | 2001 |
| depfirstname | Optional | Dependent first name | John |
| deplastname | Optional | Dependent last name | Doe |
| deprelcode | Optional | Relationship code | SP |
| enrollmentstartdate | ✅ | Start date | 1/1/2025 |
| enrollmentenddate | Optional | End date | 12/31/2025 |
| dependentrelationship | Optional | Relationship | Spouse |
| plancode | Optional | Plan code | PlanA |

## 🔌 API Endpoints

### POST /api/upload
Upload and process employee census Excel file.

**Request:**
\`\`\`
FormData:
- file: Excel file (.xlsx)
- year: Tax year (optional, defaults to 2025)
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "year": 2025,
  "counts": {
    "demographic": 100,
    "employeeDetails": 100,
    "eligibility": 200,
    "enrollment": 150,
    "dependentEnrollment": 75
  }
}
\`\`\`

### GET /api/download-tables
Download all derived tables as Excel file.

**Response:** Excel file with 8 sheets (daily/monthly status, eligibility, enrollment, dependent enrollment)

### GET /api/download-aca
Download ACA monthly report as CSV.

**Response:** CSV file with employee_aca_monthly data (Line 14 & 16 codes)

### GET /api/penalty-dashboard?year=2025&department=Sales
Get penalty dashboard data.

**Query Params:**
- year: Tax year (required)
- department: Filter by department (optional)

**Response:**
\`\`\`json
{
  "employees": [...],
  "summary": {
    "totalEmployees": 100,
    "employeesWithPenalty": 15,
    "percentageWithPenalty": 15,
    "totalPenaltyAmount": 45000,
    "penaltyAAmount": 25000,
    "penaltyBAmount": 20000
  },
  "departments": ["Sales", "Marketing", "Engineering"]
}
\`\`\`

## 📈 Scaling Strategy

### Current Capacity
- **Small files** (100 employees): 2-5 seconds
- **Medium files** (1000 employees): 10-30 seconds
- **Large files** (5000 employees): 1-3 minutes

### Bottlenecks Identified
1. **Sequential employee processing** in penalty dashboard
2. **Single database connection** for all queries
3. **No caching** of frequently accessed data
4. **No batch processing** for large files

### Phase 1: Immediate Optimizations (0-100K employees)
1. **Batch Database Queries**: Replace sequential queries with single JOIN query
2. **Add Database Indexes**: Speed up common queries
3. **Implement Caching**: Cache penalty dashboard results (Redis or in-memory)
4. **Background Processing**: Move upload processing to background jobs

### Phase 2: Scale to 100K-1M employees
1. **Database Partitioning**: Partition tables by year
2. **Read Replicas**: Use Supabase read replicas for dashboard queries
3. **Parallel Processing**: Process employees in parallel batches
4. **Materialized Views**: Pre-calculate penalty summaries

### Phase 3: Enterprise Scale (1M+ employees)
1. **Microservices Architecture**: Split into separate services
2. **Event-Driven Architecture**: Use message queues (RabbitMQ, Kafka)
3. **Column-Store Database**: Switch to TimescaleDB or ClickHouse for analytics
4. **CDN for Reports**: Cache generated Excel/CSV files on CDN
5. **Horizontal Scaling**: Scale workers based on queue depth

### Monitoring & Alerts
1. **Performance Monitoring**: Track query times, job durations
2. **Error Tracking**: Sentry or similar for error monitoring
3. **Database Monitoring**: Track connection pool, slow queries
4. **Alerting**: Alert on job failures, slow performance, high error rates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Excel file with census data

### Installation
\`\`\`bash
# Clone the repository
git clone <repository-url>
cd employee-census-table

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
\`\`\`

### First Upload
1. Navigate to http://localhost:3000
2. Click "Select Excel File"
3. Choose your census Excel file (must have 4 sheets)
4. Click "Upload & Process Data"
5. Wait for processing to complete
6. View penalty dashboard at /aca/penalty-dashboard

### Troubleshooting
- **"Missing sheet" error**: Ensure Excel has all 4 required sheets with exact names
- **"Invalid date" error**: Check date formats in Excel (use DATE columns, not TEXT)
- **Slow processing**: Normal for large files (1000+ employees)
- **Database errors**: Check Supabase connection and ensure tables exist

## 📚 Additional Resources
- [IRS Form 1095-C Instructions](https://www.irs.gov/forms-pubs/about-form-1095-c)
- [ACA Employer Reporting Guide](https://www.irs.gov/affordable-care-act/employers)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **UI**: React with Tailwind CSS & shadcn/ui
- **TypeScript**: Full type safety
- **Excel Parsing**: xlsx library
- **Deployment**: Vercel

## 📝 License
MIT License - See LICENSE file for details

## 🤝 Contributing
Contributions welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ to help employers navigate ACA compliance**
