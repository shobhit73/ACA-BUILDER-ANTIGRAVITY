# Complete ACA Form 1095-C Builder - Project Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Database Schema Design](#database-schema-design)
3. [Excel Import Process](#excel-import-process)
4. [PDF Field Mapping](#pdf-field-mapping)
5. [ACA Code Assignment Logic](#aca-code-assignment-logic)
6. [Implementation Guide](#implementation-guide)
7. [Troubleshooting & Lessons Learned](#troubleshooting--lessons-learned)

---

## Project Overview

This application automates the generation of IRS Form 1095-C (Employer-Provided Health Insurance Offer and Coverage) by:
1. Importing employee data from Excel files
2. Storing data in Supabase PostgreSQL database
3. Generating filled PDF forms using pdf-lib

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript
- Supabase (PostgreSQL)
- pdf-lib (PDF generation)
- xlsx (Excel parsing)
- Tailwind CSS + shadcn/ui

---

## Database Schema Design

### Table 1: `employee_details`
Stores employee demographic and employer information.

\`\`\`sql
CREATE TABLE employee_details (
  employee_id SERIAL PRIMARY KEY,
  first_name TEXT,
  middle_initial TEXT,
  last_name TEXT,
  ssn TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  employer_name TEXT,
  ein TEXT,
  employer_address TEXT,
  contact_telephone TEXT,
  employer_city TEXT,
  employer_state TEXT,
  employer_country TEXT,
  employer_zip_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

**Excel Column Mapping:**
- `First Name` → `first_name`
- `Middle Initial` → `middle_initial`
- `Last Name` → `last_name`
- `SSN` → `ssn`
- `Address` → `address_line1`
- `City` → `city`
- `State` → `state`
- `Country` → `country`
- `ZIP Code` → `zip_code`
- `Employer Name` → `employer_name`
- `EIN` → `ein`
- `Employer Address` → `employer_address`
- `Contact Phone` → `contact_telephone`
- `Employer City` → `employer_city`
- `Employer State` → `employer_state`
- `Employer Country` → `employer_country`
- `Employer ZIP` → `employer_zip_code`

### Table 2: `employee_aca_monthly`
Stores monthly ACA codes for each employee.

\`\`\`sql
CREATE TABLE employee_aca_monthly (
  id SERIAL PRIMARY KEY,
  employee_id TEXT,
  month_start DATE,
  line_14 TEXT,  -- Offer of Coverage code (1A, 1B, 1C, etc.)
  line_16 TEXT,  -- Safe Harbor code (2C, 2F, 2H, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

**Excel Column Mapping:**
- `Employee ID` → `employee_id`
- `Month` → `month_start` (converted to DATE)
- `Line 14 Code` → `line_14`
- `Line 16 Code` → `line_16`

---

## PDF Field Mapping

### Understanding IRS Form 1095-C Structure

The IRS Form 1095-C uses **XFA (XML Forms Architecture)** with hierarchical field paths. Each field has a full path like:
\`\`\`
topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]
\`\`\`

### Complete Field Mapping

#### Part I: Employee Information (Lines 1-6)

| PDF Field Path | Line | Description | Database Source |
|---------------|------|-------------|-----------------|
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]` | 1 | First Name | `employee_details.first_name` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_2[0]` | 1 | Middle Initial | `employee_details.middle_initial` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_3[0]` | 1 | Last Name | `employee_details.last_name` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_4[0]` | 2 | SSN | `employee_details.ssn` (formatted as XXX-XX-XXXX) |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_5[0]` | 3 | Street Address | `employee_details.address_line1` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_6[0]` | 4 | City | `employee_details.city` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_7[0]` | 5 | State | `employee_details.state` |
| `topmostSubform[0].Page1[0].EmployeeName[0].f1_8[0]` | 6 | ZIP Code | `employee_details.zip_code` |

#### Part I: Employer Information (Lines 7-13)

| PDF Field Path | Line | Description | Database Source |
|---------------|------|-------------|-----------------|
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_9[0]` | 7 | Employer Name | `employee_details.employer_name` |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_10[0]` | 8 | EIN | `employee_details.ein` (formatted as XX-XXXXXXX) |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_11[0]` | 9 | Employer Address | `employee_details.employer_address` |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_12[0]` | 10 | Contact Phone | `employee_details.contact_telephone` |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_13[0]` | 11 | Employer City | `employee_details.employer_city` |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_14[0]` | 12 | Employer State | `employee_details.employer_state` |
| `topmostSubform[0].Page1[0].EmployerIssuer[0].f1_15[0]` | 13 | Employer ZIP | `employee_details.employer_zip_code` |

#### Part II: Line 14 - Offer of Coverage Codes (Monthly)

| PDF Field Path | Month | Database Source |
|---------------|-------|-----------------|
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_17[0]` | All 12 Months | Use if same code for all months |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_18[0]` | January | `employee_aca_monthly.line_14` WHERE `month_start = '2025-01-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_19[0]` | February | `employee_aca_monthly.line_14` WHERE `month_start = '2025-02-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_20[0]` | March | `employee_aca_monthly.line_14` WHERE `month_start = '2025-03-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_21[0]` | April | `employee_aca_monthly.line_14` WHERE `month_start = '2025-04-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_22[0]` | May | `employee_aca_monthly.line_14` WHERE `month_start = '2025-05-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_23[0]` | June | `employee_aca_monthly.line_14` WHERE `month_start = '2025-06-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_24[0]` | July | `employee_aca_monthly.line_14` WHERE `month_start = '2025-07-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_25[0]` | August | `employee_aca_monthly.line_14` WHERE `month_start = '2025-08-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_26[0]` | September | `employee_aca_monthly.line_14` WHERE `month_start = '2025-09-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_27[0]` | October | `employee_aca_monthly.line_14` WHERE `month_start = '2025-10-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_28[0]` | November | `employee_aca_monthly.line_14` WHERE `month_start = '2025-11-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_29[0]` | December | `employee_aca_monthly.line_14` WHERE `month_start = '2025-12-01'` |

**Valid Line 14 Codes:**
- `1A` - Qualifying Offer (minimum value, affordable, offered to spouse & dependents)
- `1B` - Minimum value offered to employee only
- `1C` - Minimum value offered to employee & dependents (not spouse)
- `1D` - Minimum value offered to employee & spouse (not dependents)
- `1E` - Minimum value offered to employee, spouse & dependents
- `1F` - Coverage NOT providing minimum value
- `1G` - Not full-time but enrolled in coverage
- `1H` - No offer of coverage
- `1J` - Minimum value, spouse conditional, no dependents
- `1K` - Minimum value, spouse conditional, with dependents
- `1L-1U` - Individual coverage HRA variations
- `1R` - Individual coverage HRA not affordable
- `1S` - Individual coverage HRA for non-full-time employee

#### Part II: Line 16 - Safe Harbor Codes (Monthly)

| PDF Field Path | Month | Database Source |
|---------------|-------|-----------------|
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_43[0]` | All 12 Months | Use if same code for all months |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_44[0]` | January | `employee_aca_monthly.line_16` WHERE `month_start = '2025-01-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_45[0]` | February | `employee_aca_monthly.line_16` WHERE `month_start = '2025-02-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_46[0]` | March | `employee_aca_monthly.line_16` WHERE `month_start = '2025-03-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_47[0]` | April | `employee_aca_monthly.line_16` WHERE `month_start = '2025-04-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_48[0]` | May | `employee_aca_monthly.line_16` WHERE `month_start = '2025-05-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].Row3[0].f1_49[0]` | June | `employee_aca_monthly.line_16` WHERE `month_start = '2025-06-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_50[0]` | July | `employee_aca_monthly.line_16` WHERE `month_start = '2025-07-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_51[0]` | August | `employee_aca_monthly.line_16` WHERE `month_start = '2025-08-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_52[0]` | September | `employee_aca_monthly.line_16` WHERE `month_start = '2025-09-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_53[0]` | October | `employee_aca_monthly.line_16` WHERE `month_start = '2025-10-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_54[0]` | November | `employee_aca_monthly.line_16` WHERE `month_start = '2025-11-01'` |
| `topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_55[0]` | December | `employee_aca_monthly.line_16` WHERE `month_start = '2025-12-01'` |

**Valid Line 16 Codes:**
- `2A` - Employee not employed during the month
- `2B` - Employee not a full-time employee
- `2C` - Employee enrolled in coverage
- `2D` - Employee in a section 4980H(b) Limited Non-Assessment Period
- `2E` - Multiemployer interim rule relief
- `2F` - Section 4980H affordability Form W-2 safe harbor
- `2G` - Section 4980H affordability federal poverty line safe harbor
- `2H` - Section 4980H affordability rate of pay safe harbor
- `2I` - Non-calendar year transition relief applies

---

## ACA Code Assignment Logic

This section details how the system automatically determines the IRS Form 1095-C codes (Line 14 and Line 16) based on employee data.

### Line 14: Offer of Coverage Series (1 Series)

This code describes "What coverage was offered to the employee?"

| Code | Meaning | Criteria in System |
|------|---------|--------------------|
| **1A** | **Qualifying Offer** | Full-Time employee offered **Employee + Family** coverage that is **Affordable** (Cost ≤ $50). |
| **1B** | **Employee Only** | Offered Minimum Value coverage to **Employee Only**. (No spouse/dependents). |
| **1C** | **Employee + Children** | Offered coverage to **Employee and Children**, but NOT Spouse. |
| **1D** | **Employee + Spouse** | Offered coverage to **Employee and Spouse**, but NOT Children. |
| **1E** | **Employee + Family** | Offered coverage to **Employee, Spouse, and Children**, but cost is > $50 (Unaffordable). OR Enrolled in 'EMPFAM' tier. |
| **1F** | **MEC (No MV)** | Offered "Minimum Essential Coverage" but it doesn't provide "Minimum Value". |
| **1G** | **Part-Time Enrolled** | Employee was **Part-Time** (never Full-Time in year) but **Enrolled** in coverage. |
| **1H** | **No Offer** | No offer of coverage was made. (Also used for Part-Time employees not enrolled). |

### Line 16: Section 4980H Safe Harbor Codes (2 Series)

This code describes "Why is the employer not subject to a penalty?"

| Code | Meaning | Criteria in System |
|------|---------|--------------------|
| **2A** | **Not Employed** | Employee was not employed on any day of the month. |
| **2B** | **Not Full-Time** | Employee was not a full-time employee for the full month. |
| **2C** | **Enrolled** | Employee **Enrolled** in the coverage offered. (Overrides employment status). |
| **2D** | **Limited Non-Assessment** | Employee in a "Waiting Period" or initial measurement period. |
| **2F** | **W-2 Safe Harbor** | Coverage was **Affordable** (≤ $50) but employee **Waived/Declined** it. |
| **2G** | **Federal Poverty Line** | Coverage cost is below federal poverty line threshold (not currently implemented). |
| **2H** | **Rate of Pay** | Coverage was offered but **Unaffordable** (> $50) and employee **Waived**. |

### Logic Flow & Priority

The system calculates codes using the following priority order:

1.  **Check for 1E (High Cost Family Offer):**
    *   If employed full month AND offered family coverage > $50 → **1E**

2.  **Check Full-Time Status:**
    *   **If Full-Time:**
        *   Is it a "Qualifying Offer" (Family + Affordable)? → **1A**
        *   Check Enrollment Fallback: If enrolled, assign code based on tier (**1B**, **1C**, **1D**, **1E**)
        *   Otherwise, assign based on specific tiers offered (**1B**, **1C**, **1D**)
        *   If only "Other Plan" offered → **1F**
        *   Else → **1H**

    *   **If Not Full-Time:**
        *   Check Enrollment Fallback: If enrolled, assign code based on tier (**1B**, **1C**, **1D**, **1E**)
        *   If enrolled (generic) AND never full-time in year → **1G**
        *   Else → **1H**

### Affordability Threshold
The system currently uses a simplified "Safe Harbor" threshold of **$50.00**.
*   Employee Share ≤ $50 = Affordable
*   Employee Share > $50 = Unaffordable

This can be adjusted in the `scripts/00_complete_migration.sql` file.

---

## Implementation Guide

### Step 1: Project Setup

\`\`\`bash
# Create Next.js project
npx create-next-app@latest aca-form-builder --typescript --tailwind --app

# Install dependencies
npm install @supabase/ssr @supabase/supabase-js pdf-lib xlsx
npm install @radix-ui/react-select @radix-ui/react-label
\`\`\`

### Step 2: Set Up Supabase Integration

1. Create a Supabase project at https://supabase.com
2. Add environment variables to your project:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Create database tables using the SQL scripts:

\`\`\`sql
-- Create employee_details table
CREATE TABLE employee_details (
  employee_id SERIAL PRIMARY KEY,
  first_name TEXT,
  middle_initial TEXT,
  last_name TEXT,
  ssn TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  employer_name TEXT,
  ein TEXT,
  employer_address TEXT,
  contact_telephone TEXT,
  employer_city TEXT,
  employer_state TEXT,
  employer_country TEXT,
  employer_zip_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create employee_aca_monthly table
CREATE TABLE employee_aca_monthly (
  id SERIAL PRIMARY KEY,
  employee_id TEXT,
  month_start DATE,
  line_14 TEXT,
  line_16 TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Step 3: Create Supabase Client

\`\`\`typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

let supabaseInstance: ReturnType<typeof createServerClient> | null = null

export async function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const cookieStore = await cookies()

  supabaseInstance = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component, ignore
          }
        },
      },
    }
  )

  return supabaseInstance
}
\`\`\`

### Step 4: Excel Import Logic

\`\`\`typescript
// app/actions/import-excel.ts
'use server'

import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

export async function importEmployeeData(file: File) {
  const supabase = await createClient()
  
  // Read Excel file
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(worksheet)

  // Insert into database
  const { error } = await supabase
    .from('employee_details')
    .insert(data.map(row => ({
      first_name: row['First Name'],
      middle_initial: row['Middle Initial'],
      last_name: row['Last Name'],
      ssn: row['SSN'],
      // ... map other fields
    })))

  if (error) throw error
  return { success: true }
}
\`\`\`

### Step 5: PDF Generation Library

\`\`\`typescript
// lib/pdf-generator.ts
import { PDFDocument } from 'pdf-lib'

export async function fillForm1095C(employeeData: any, monthlyCodes: any[]) {
  // Load blank PDF
  const pdfUrl = '/forms/f1095c.pdf'
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  
  const form = pdfDoc.getForm()
  
  // Fill Part I - Employee
  form.getTextField('topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]')
    .setText(employeeData.first_name || '')
  
  // Fill Part II - Monthly codes
  monthlyCodes.forEach((monthData, index) => {
    const fieldNum = 18 + index // f1_18 through f1_29
    form.getTextField(`topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_${fieldNum}[0]`)
      .setText(monthData.line_14 || '')
  })
  
  // Flatten and return
  form.flatten()
  return await pdfDoc.save()
}
\`\`\`

### Step 6: Server Action for PDF Generation

\`\`\`typescript
// app/actions/generate-1095c.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { fillForm1095C } from '@/lib/pdf-generator'

export async function generatePDF(employeeId: number, year: number) {
  const supabase = await createClient()
  
  // Fetch employee data
  const { data: employee } = await supabase
    .from('employee_details')
    .select('*')
    .eq('employee_id', employeeId)
    .single()
  
  // Fetch monthly codes
  const { data: monthlyCodes } = await supabase
    .from('employee_aca_monthly')
    .select('*')
    .eq('employee_id', employeeId.toString())
    .gte('month_start', `${year}-01-01`)
    .lte('month_start', `${year}-12-31`)
    .order('month_start')
  
  // Generate PDF
  const pdfBytes = await fillForm1095C(employee, monthlyCodes || [])
  
  return {
    pdfBytes: Array.from(pdfBytes),
    filename: `Form_1095-C_${year}_${employee.last_name}_${employee.first_name}.pdf`
  }
}
\`\`\`

### Step 7: UI Implementation

\`\`\`tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import { generatePDF } from './actions/generate-1095c'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Home() {
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(2025)
  
  const handleGenerate = async () => {
    const result = await generatePDF(Number(employeeId), year)
    
    // Download PDF
    const blob = new Blob([new Uint8Array(result.pdfBytes)], { 
      type: 'application/pdf' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
  }
  
  return (
    <div className="p-8">
      <Input 
        type="number"
        placeholder="Employee ID"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      />
      <Button onClick={handleGenerate}>
        Generate 1095-C
      </Button>
    </div>
  )
}
\`\`\`

---

## Troubleshooting & Lessons Learned

### Issue 1: PDF Fields Not Filling

**Problem:** Generated PDF was completely blank.

**Root Cause:** PDF field names didn't match. I was using short names like `f1_1` but the PDF uses full hierarchical paths like `topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]`.

**Solution:**
1. Added debug logging to list all field names in the PDF
2. Discovered the actual field structure using `form.getFields().map(f => f.getName())`
3. Updated all field paths to use complete hierarchical names

**Key Learning:** Always inspect the actual PDF field names before attempting to fill them. Use `console.log("[v0] ...")` to debug field names.

### Issue 2: Part II Fields Using Wrong Parent

**Problem:** Part I filled correctly, but Part II (monthly codes) remained blank.

**Root Cause:** Part II fields used `Table1[0]` in the hierarchy, not `PartII[0]` as I assumed.

**Solution:**
1. Filtered debug logs to show only Part II related fields
2. Discovered the pattern: `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_XX[0]`
3. Updated all Part II field paths from `PartII[0]` to `Table1[0]`

**Key Learning:** Don't assume PDF structure based on form appearance. Always verify the actual field hierarchy through debugging.

### Issue 3: SSN and EIN Formatting

**Problem:** SSN and EIN fields needed specific formatting (XXX-XX-XXXX and XX-XXXXXXX).

**Solution:**
\`\`\`typescript
function formatSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
  }
  return ssn
}

function formatEIN(ein: string): string {
  const cleaned = ein.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`
  }
  return ein
}
\`\`\`

**Key Learning:** Always format sensitive data according to IRS requirements.

### Issue 4: Monthly Data Mapping

**Problem:** Needed to map 12 months of data to 12 separate PDF fields.

**Solution:**
\`\`\`typescript
const monthlyFieldMapping = [
  { month: 1, fieldNum: 18 },  // January -> f1_18
  { month: 2, fieldNum: 19 },  // February -> f1_19
  // ... etc
]

monthlyCodes.forEach((monthData) => {
  const month = new Date(monthData.month_start).getMonth() + 1
  const mapping = monthlyFieldMapping.find(m => m.month === month)
  if (mapping) {
    const fieldPath = `topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_${mapping.fieldNum}[0]`
    fillTextField(form, fieldPath, monthData.line_14)
  }
})
\`\`\`

**Key Learning:** Create clear mappings between database dates and PDF field numbers.

### Best Practices Discovered

1. **Use Singleton Pattern for Supabase Client**
   - Prevents multiple client instances
   - Improves performance

2. **Add Comprehensive Logging**
   - Log all field names during development
   - Log success/failure for each field
   - Use `console.log("[v0] ...")` prefix for easy filtering

3. **Flatten PDF Forms After Filling**
   - Prevents users from editing the filled PDF
   - Ensures data integrity
   \`\`\`typescript
   form.flatten()
   \`\`\`

4. **Handle Missing Data Gracefully**
   - Always provide fallback values
   - Use `|| ''` to prevent null/undefined errors
   \`\`\`typescript
   form.getTextField(fieldPath).setText(value || '')
   \`\`\`

5. **Store Blank PDF in Codebase**
   - Prevents version mismatches
   - Ensures consistent field structure
   - Store in `/public/forms/` directory

6. **Support Both Individual and Bulk Generation**
   - Individual: Quick testing and single employee needs
   - Bulk: Year-end reporting for all employees
   - Use ZIP files for bulk downloads

---

## Complete File Structure

\`\`\`
aca-form-builder/
├── app/
│   ├── actions/
│   │   ├── generate-1095c.ts      # PDF generation server action
│   │   └── import-excel.ts        # Excel import server action
│   ├── page.tsx                   # Main UI
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── lib/
│   ├── pdf-generator.ts           # PDF filling logic
│   └── supabase/
│       └── server.ts              # Supabase client
├── public/
│   └── forms/
│       └── f1095c.pdf             # Blank IRS Form 1095-C
├── components/
│   └── ui/                        # shadcn/ui components
├── docs/
│   └── COMPLETE_PROJECT_GUIDE.md  # This file
└── package.json
\`\`\`

---

## Quick Start Checklist

- [ ] Create Next.js project with TypeScript and Tailwind
- [ ] Install dependencies: `@supabase/ssr`, `pdf-lib`, `xlsx`
- [ ] Set up Supabase project and add environment variables
- [ ] Create database tables (`employee_details`, `employee_aca_monthly`)
- [ ] Download blank IRS Form 1095-C and save to `/public/forms/`
- [ ] Create Supabase client with singleton pattern
- [ ] Implement Excel import functionality
- [ ] Create PDF generator with correct field paths
- [ ] Build server actions for PDF generation
- [ ] Create UI with year selector and employee input
- [ ] Test with sample data
- [ ] Add bulk generation support
- [ ] Deploy to Vercel

---

## Additional Resources

- **IRS Form 1095-C Instructions**: https://www.irs.gov/forms-pubs/about-form-1095-c
- **pdf-lib Documentation**: https://pdf-lib.js.org/
- **Supabase Documentation**: https://supabase.com/docs
- **Next.js App Router**: https://nextjs.org/docs/app

---

## Support & Maintenance

### Common Issues

**PDF Not Downloading:**
- Check browser console for errors
- Verify PDF bytes are being returned from server action
- Ensure blob creation is correct

**Fields Not Filling:**
- Verify field paths match PDF structure
- Check debug logs for field name mismatches
- Ensure data exists in database

**Database Connection Errors:**
- Verify Supabase environment variables
- Check Supabase project is active
- Ensure RLS policies allow access

### Future Enhancements

1. **Part III Support** - Add covered individuals section for self-insured plans
2. **Line 15 Support** - Add employee required contribution amounts
3. **Validation** - Add ACA code validation before PDF generation
4. **Audit Trail** - Track when PDFs were generated and by whom
5. **Email Distribution** - Automatically email 1095-C forms to employees
6. **IRS Submission** - Generate 1094-C transmittal form for IRS filing

---

**Document Version:** 1.0  
**Last Updated:** November 2, 2025  
**Author:** v0 AI Assistant
