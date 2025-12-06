import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Helper to parse CSV
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Robust CSV line parser that handles quoted strings containing commas
  const parseLine = (line: string): string[] => {
    const values: string[] = []
    let currentValue = ""
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentValue += '"' // Handle escaped quotes
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue.trim())
        currentValue = ""
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    return values
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = parseLine(line).map(v => v.replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : ""
    })
    rows.push(row)
  }

  return rows
}

// Helper to parse date (handles MM/DD/YYYY and YYYY-MM-DD formats)
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  if (!trimmed) return null

  // Case 1: already looks like YYYY-MM-DD
  if (trimmed.includes("-")) {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().split("T")[0] // normalized YYYY-MM-DD
    }
  }

  // Case 2: MM/DD/YYYY
  const parts = trimmed.split("/")
  if (parts.length === 3) {
    const [month, day, year] = parts
    if (month && day && year) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }

  return null
}

// Helper to parse boolean
function parseBooleanYN(value: string): boolean {
  if (!value) return false
  const upper = value.trim().toUpperCase()
  return upper === "Y" || upper === "YES" || upper === "TRUE"
}

function parseBoolean(value: string): boolean {
  if (!value) return false
  const lower = value.trim().toLowerCase()
  return lower === "true" || lower === "yes" || lower === "1" || lower === "y"
}

function transformPayFrequency(value: string): string | null {
  if (!value) return null
  const upper = value.trim().toUpperCase()
  if (upper === "M") return "Monthly"
  if (upper === "B") return "Biweekly"
  return value
}

function transformEmploymentType(value: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed === "1") return "Full Time"
  if (trimmed === "2") return "Part Time"
  return value
}

function transformEnrollmentCode(value: string): string | null {
  if (!value) return null
  const upper = value.trim().toUpperCase()
  if (upper === "E") return "Enrolled"
  if (upper === "C") return "COBRA"
  if (upper === "W") return "Waived"
  return value
}

function toDateString(date: string | null | undefined): string | null {
  if (!date) return null
  // If it's already a date string, return it
  if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date
  }
  // If it's a full timestamp, extract just the date part
  if (typeof date === "string") {
    return date.split("T")[0]
  }
  return null
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
  let lastError: Error | unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        console.log(`[v0] Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms delay`)
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
      }
    }
  }
  throw lastError
}

interface RowError {
  rowNumber: number
  rowData: Record<string, string>
  error: string
  errorType: "validation" | "database" | "parsing" | "missing_field"
  expectedValue?: string
  receivedValue?: string
  field?: string
}

interface ImportResult {
  success: boolean
  processedRows: number
  totalRows: number
  failedRows: number
  errors?: RowError[]
  performance: {
    totalTimeMs: number
    parseTimeMs: number
    dbTimeMs: number
    avgRowTimeMs: number
    throughput: number
  }
  fileName: string
  fileType: string
}

function validateRequiredFields(row: Record<string, string>, requiredFields: string[]): RowError | null {
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === "") {
      return {
        rowNumber: 0, // Will be set by caller
        rowData: row,
        error: `Missing required field: ${field}`,
        errorType: "missing_field",
        field,
        expectedValue: "Non-empty value",
        receivedValue: row[field] || "(empty)",
      }
    }
  }
  return null
}

function validateDateField(value: string, fieldName: string): RowError | null {
  if (!value) return null
  const parsed = parseDate(value)
  if (!parsed) {
    return {
      rowNumber: 0,
      rowData: {},
      error: `Invalid date format in ${fieldName}`,
      errorType: "validation",
      field: fieldName,
      expectedValue: "MM/DD/YYYY or YYYY-MM-DD format",
      receivedValue: value,
    }
  }
  return null
}

function validateNumericField(value: string, fieldName: string): RowError | null {
  if (!value) return null
  const num = Number.parseFloat(value)
  if (Number.isNaN(num)) {
    return {
      rowNumber: 0,
      rowData: {},
      error: `Invalid numeric value in ${fieldName}`,
      errorType: "validation",
      field: fieldName,
      expectedValue: "Numeric value",
      receivedValue: value,
    }
  }
  return null
}

// Helper to normalize employee IDs
function normalizeEmployeeId(employeeId: string | undefined | null): string {
  if (employeeId === null || employeeId === undefined) return ""
  const s = String(employeeId).trim()
  if (!s) return ""
  // Strip leading "E" and any non-digit chars: "E1001" → "1001"
  const numeric = s.replace(/^E/i, "").replace(/\D/g, "")
  return numeric || ""
}

/**
 * POST /api/import
 * 
 * Handles bulk data import from CSV files.
 * Features:
 * - Validates file type and content
 * - Parses CSV with automatic type conversion
 * - Validates required fields and data formats per row
 * - Batches database operations for performance
 * - Retries failed operations
 * - Returns detailed error report for failed rows
 */
export async function POST(request: NextRequest) {
  const importStartTime = performance.now()
  console.log("[v0] ========== CSV IMPORT STARTED ==========")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    console.log(`[v0] Import request - Type: ${type}, File: ${file?.name}`)

    if (!file) {
      console.error("[v0] ERROR: No file provided")
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const parseStartTime = performance.now()
    const text = await file.text()
    const rows = parseCSV(text)
    const parseTime = performance.now() - parseStartTime

    console.log(`[v0] File parsed in ${parseTime.toFixed(2)}ms - Found ${rows.length} rows`)

    if (rows.length === 0) {
      console.error("[v0] ERROR: Empty or invalid CSV file")
      return NextResponse.json({ success: false, error: "Empty or invalid CSV file" }, { status: 400 })
    }

    const supabase = await createClient()
    let processedRows = 0
    let failedRows = 0
    const detailedErrors: RowError[] = []

    const rowTimings: number[] = []
    const dbStartTime = performance.now()

    const BATCH_SIZE = 10
    console.log(`[v0] Processing ${rows.length} rows in batches of ${BATCH_SIZE}`)

    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length)
      const batch = rows.slice(batchStart, batchEnd)

      console.log(
        `[v0] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} (rows ${batchStart + 1}-${batchEnd})`,
      )

      const batchPromises = batch.map(async (row, index) => {
        const rowNumber = batchStart + index + 1
        const rowStartTime = performance.now()

        try {
          let result
          let validationError: RowError | null = null

          switch (type) {
            case "Company_Details":
              const companyCode = row["Company Code"] || row["company_code"]
              const companyName = row["Company Name"] || row["company_name"]

              if (!companyCode || !companyCode.trim()) {
                validationError = { rowNumber, rowData: row, error: "Missing required field: Company Code", errorType: "missing_field", field: "Company Code" }
                throw validationError
              }
              if (!companyName || !companyName.trim()) {
                validationError = { rowNumber, rowData: row, error: "Missing required field: Company Name", errorType: "missing_field", field: "Company Name" }
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_company_details", {
                  p_company_code: companyCode,
                  p_company_name: companyName,
                  p_dba_name: row["DBA Name"] || row["dba_name"] || null,
                  p_ein: row["Company EIN"] || row["ein"] || null,
                  p_address_line_1: row["Address Line 1"] || row["address_line_1"] || null,
                  p_address_line_2: row["Address Line 2"] || row["address_line_2"] || null,
                  p_city: row["City"] || row["city"] || null,
                  p_state: row["State"] || row["state"] || null,
                  p_zip_code: row["Zip"] || row["zip_code"] || null,
                  p_country: row["Country"] || row["country"] || null,
                  p_contact_name: row["Contact Name"] || row["contact_name"] || null,
                  p_contact_phone: row["Phone Number"] || row["contact_phone"] || null,
                  p_contact_email: row["Contact Email"] || row["contact_email"] || null,
                  // New 1094-C Fields
                  p_is_authoritative_transmittal: parseBoolean(row["Is Authoritative"] || row["is_authoritative_transmittal"]),
                  p_is_agg_ale_group: parseBoolean(row["Is Aggregated Group"] || row["is_agg_ale_group"]),
                  p_cert_qualifying_offer: parseBoolean(row["Cert Qualifying Offer"] || row["cert_qualifying_offer"]),
                  p_cert_98_percent_offer: parseBoolean(row["Cert 98% Offer"] || row["cert_98_percent_offer"]),

                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Plan_Master":
              const pmCompanyCode = row["Company Code"] || row["company_code"]
              const pmPlanCode = row["Plan Code"] || row["plan_code"]
              const pmPlanName = row["Plan Name"] || row["plan_name"]

              if (!pmCompanyCode || !pmCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!pmPlanCode || !pmPlanCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Plan Code", errorType: "missing_field" } as RowError
              if (!pmPlanName || !pmPlanName.trim()) throw { rowNumber, rowData: row, error: "Missing: Plan Name", errorType: "missing_field" } as RowError

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_plan_master", {
                  p_company_code: pmCompanyCode,
                  p_plan_code: pmPlanCode,
                  p_plan_name: pmPlanName,
                  p_plan_type: row["Plan Type"] || row["plan_type"] || null,
                  p_mvc: parseBooleanYN(row["MVC"] || row["mvc"]),
                  p_me: parseBooleanYN(row["ME"] || row["me"]),
                  p_plan_affordable_cost: (row["Plan Affordable Cost"] || row["plan_affordable_cost"])
                    ? Number.parseFloat(row["Plan Affordable Cost"] || row["plan_affordable_cost"])
                    : null,
                  p_option_emp: row["option_emp"] ? Number.parseFloat(row["option_emp"]) : null,
                  p_option_emp_spouse: row["option_emp_spouse"] ? Number.parseFloat(row["option_emp_spouse"]) : null,
                  p_option_emp_child: row["option_emp_child"] ? Number.parseFloat(row["option_emp_child"]) : null,
                  p_option_emp_family: row["option_emp_family"] ? Number.parseFloat(row["option_emp_family"]) : null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Census":
              const ecCompanyCode = row["Company Code"] || row["company_code"]
              const ecEmployeeID = row["EmployeeID"] || row["employee_id"] || row["employeeid"]
              const ecFirstName = row["First Name"] || row["first_name"]
              const ecLastName = row["Last Name"] || row["last_name"]

              if (!ecCompanyCode || !ecCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!ecEmployeeID || !ecEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError
              if (!ecFirstName || !ecFirstName.trim()) throw { rowNumber, rowData: row, error: "Missing: First Name", errorType: "missing_field" } as RowError
              if (!ecLastName || !ecLastName.trim()) throw { rowNumber, rowData: row, error: "Missing: Last Name", errorType: "missing_field" } as RowError

              const fteValue = row["Full Time Equivalent"] || row["full_time_equivalent"]
              const fteError = validateNumericField(fteValue || "", "Full Time Equivalent")
              if (fteValue && fteError) {
                fteError.rowNumber = rowNumber
                fteError.rowData = row
                throw fteError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_census", {
                  p_company_code: ecCompanyCode,
                  p_employee_id: normalizeEmployeeId(ecEmployeeID),
                  p_first_name: ecFirstName,
                  p_middle_name: row["Middle Initial"] || row["middle_name"] || null,
                  p_last_name: ecLastName,
                  p_ssn: row["SSN"] || row["ssn"] || null,
                  p_date_of_birth: parseDate(row["Date of Birth"] || row["date_of_birth"]),
                  p_gender: row["Gender"] || row["gender"] || null,
                  p_hire_date: parseDate(row["Start Date"] || row["hire_date"] || row["start_date"]),
                  p_termination_date: parseDate(row["End Date"] || row["termination_date"] || row["end_date"]),
                  p_employment_status: row["Employee Status Code"] || row["employment_status"] || null,
                  p_job_title: row["Job Title"] || row["job_title"] || null,
                  p_department: row["Department"] || row["department"] || null,
                  p_full_time_equivalent: fteValue ? Number.parseFloat(fteValue) : null,
                  p_pay_frequency: transformPayFrequency(row["Pay Frequency"] || row["pay_frequency"]),
                  p_employment_type_code: transformEmploymentType(row["Employment Type Code"] || row["employment_type_code"]),
                  p_email: row["Email"] || row["email"] || null,
                  p_employee_category: row["employee_category"] || null,
                  p_notes: row["notes"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Address":
              const eaCompanyCode = row["Company Code"] || row["company_code"]
              const eaEmployeeID = row["EmployeeID"] || row["employee_id"]

              if (!eaCompanyCode || !eaCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!eaEmployeeID || !eaEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_address", {
                  p_company_code: eaCompanyCode,
                  p_employee_id: normalizeEmployeeId(eaEmployeeID),
                  p_effective_date: parseDate(row["Address Start Date"] || row["effective_date"] || row["address_start_date"]) || new Date().toISOString().split("T")[0],
                  p_address_line_1: row["AddressLine1"] || row["address_line_1"] || null,
                  p_address_line_2: row["Address Line 2"] || row["address_line_2"] || null,
                  p_city: row["City"] || row["city"] || null,
                  p_state: row["State"] || row["state"] || null,
                  p_zip_code: row["ZipCode"] || row["zip_code"] || null,
                  p_county: row["County"] || row["county"] || null,
                  p_country: row["Country"] || row["country"] || null,
                  p_address_end_date: parseDate(row["address_end_date"]),
                  p_notes: row["notes"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Waiting_Period":
              const ewpCompanyCode = row["Company Code"] || row["company_code"]
              const ewpEmployeeID = row["EmployeeID"] || row["employee_id"]

              if (!ewpCompanyCode || !ewpCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!ewpEmployeeID || !ewpEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_waiting_period", {
                  p_company_code: ewpCompanyCode,
                  p_employee_id: normalizeEmployeeId(ewpEmployeeID),
                  p_plan_code: row["plan_code"] || null,
                  p_effective_date: parseDate(row["effective_date"]),
                  p_waiting_period_end_date: parseDate(row["Effective Date"] || row["waiting_period_end_date"]),
                  p_wait_period_days: (row["wait_period_days"]) ? Number.parseInt(row["wait_period_days"]) : null,
                  p_is_waiting_period_waived: parseBoolean(row["Is Waiting Period Waived"] || row["is_waiting_period_waived"]),
                  p_waiver_reason: row["Waiver Reason"] || row["waiver_reason"] || null,
                  p_category_code: row["category_code"] || null,
                  p_benefit_class: row["benefit_class"] || null,
                  p_measurement_type: row["measurement_type"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Plan_Eligibility":
              const epeCompanyCode = row["Company Code"] || row["company_code"]
              const epeEmployeeID = row["EmployeeID"] || row["employee_id"]
              const epePlanCode = row["Plan Code"] || row["plan_code"]

              if (!epeCompanyCode || !epeCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!epeEmployeeID || !epeEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError
              if (!epePlanCode || !epePlanCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Plan Code", errorType: "missing_field" } as RowError

              const normalizedEligibilityEmployeeId = normalizeEmployeeId(epeEmployeeID)

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_plan_eligibility", {
                  p_company_code: epeCompanyCode,
                  p_employee_id: normalizedEligibilityEmployeeId,
                  p_plan_code: String(epePlanCode),
                  p_eligibility_start_date:
                    toDateString(parseDate(row["Effective Date"] || row["eligibility_start_date"])) || new Date().toISOString().split("T")[0],
                  p_eligibility_end_date: toDateString(parseDate(row["Expiry Date"] || row["eligibility_end_date"])),
                  p_eligibility_status: row["eligibility_status"] || "Active",
                  p_benefit_class: row["Benefit Class"] || row["benefit_class"] || null,
                  p_measurement_type: row["Measurement_Type"] || row["measurement_type"] || null,
                  p_option_code: row["Option Code"] || row["option_code"] || null,
                  p_plan_cost: (row["Plan Cost"] || row["plan_cost"]) ? Number.parseFloat(row["Plan Cost"] || row["plan_cost"]) : null,
                  p_category_code: row["category_code"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: toDateString(parseDate(row["Add Date"] || row["add_date"])),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Plan_Enrollment":
              const epEnrollmentID = row["Enrollment ID"] || row["enrollment_id"]
              const epCompanyCode = row["Company Code"] || row["company_code"]
              const epEmployeeID = row["EmployeeID"] || row["employee_id"]
              const epPlanCode = row["Plan Code"] || row["plan_code"]

              if (!epEnrollmentID || !epEnrollmentID.trim()) throw { rowNumber, rowData: row, error: "Missing: Enrollment ID", errorType: "missing_field" } as RowError
              if (!epCompanyCode || !epCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!epEmployeeID || !epEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError
              if (!epPlanCode || !epPlanCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Plan Code", errorType: "missing_field" } as RowError

              const normalizedEnrollmentEmployeeId = normalizeEmployeeId(epEmployeeID)

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_plan_enrollment", {
                  p_enrollment_id: epEnrollmentID,
                  p_company_code: epCompanyCode,
                  p_employee_id: normalizedEnrollmentEmployeeId,
                  p_plan_code: String(epPlanCode),
                  p_enrollment_date:
                    toDateString(parseDate(row["Event Date"] || row["enrollment_date"])) || new Date().toISOString().split("T")[0],
                  p_effective_date:
                    toDateString(parseDate(row["Effective Date"] || row["effective_date"])) || new Date().toISOString().split("T")[0],
                  p_termination_date: toDateString(parseDate(row["Expiry Date"] || row["termination_date"])),
                  p_coverage_tier: row["Category Code"] || row["coverage_tier"] || null,
                  p_enrollment_status: transformEnrollmentCode(row["Enrollment Code"] || row["enrollment_status"]),
                  p_enrollment_event: row["Enrollment Event"] || row["enrollment_event"] || null,
                  p_option_code: row["Option Code"] || row["option_code"] || null,
                  p_category_code: row["category_code"] || null,
                  p_benefit_class: row["benefit_class"] || null,
                  p_measurement_type: row["measurement_type"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: toDateString(parseDate(row["Add Date"] || row["add_date"])),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Employee_Dependent":
              const edCompanyCode = row["Company Code"] || row["company_code"]
              const edEmployeeID = row["EmployeeID"] || row["employee_id"]
              const edDependentID = row["DependentID"] || row["dependent_id"]
              const edFirstName = row["First Name"] || row["first_name"]
              const edLastName = row["Last Name"] || row["last_name"]

              if (!edCompanyCode || !edCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!edEmployeeID || !edEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: EmployeeID", errorType: "missing_field" } as RowError
              if (!edDependentID || !edDependentID.trim()) throw { rowNumber, rowData: row, error: "Missing: DependentID", errorType: "missing_field" } as RowError
              if (!edFirstName || !edFirstName.trim()) throw { rowNumber, rowData: row, error: "Missing: First Name", errorType: "missing_field" } as RowError
              if (!edLastName || !edLastName.trim()) throw { rowNumber, rowData: row, error: "Missing: Last Name", errorType: "missing_field" } as RowError

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_dependent", {
                  p_company_code: edCompanyCode,
                  p_employee_id: normalizeEmployeeId(edEmployeeID),
                  p_dependent_id: edDependentID,
                  p_first_name: edFirstName,
                  p_middle_name: row["Middle Initial"] || row["middle_name"] || null,
                  p_last_name: edLastName,
                  p_ssn: row["SSN"] || row["ssn"] || row["dependent_ssn"] || null,
                  p_date_of_birth: parseDate(row["Date of Birth"] || row["date_of_birth"]),
                  p_gender: row["Gender"] || row["gender"] || null,
                  p_relationship: row["Relationship Code"] || row["relationship"] || null,
                  p_is_disabled: parseBoolean(row["Is Disabled"] || row["is_disabled"]),
                  p_enrollment_id: row["enrollment_id"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Plan_Enrollment_Cost":
              const pecEnrollmentID = row["Enrollment ID"] || row["enrollment_id"]
              if (!pecEnrollmentID || !pecEnrollmentID.trim()) throw { rowNumber, rowData: row, error: "Missing: Enrollment ID", errorType: "missing_field" } as RowError

              const pecEmployeeCostVal = row["Employee Cost"] || row["employee_cost"]
              const pecEmployeeCostError = validateNumericField(pecEmployeeCostVal || "", "Employee Cost")
              if (pecEmployeeCostVal && pecEmployeeCostError) {
                pecEmployeeCostError.rowNumber = rowNumber
                pecEmployeeCostError.rowData = row
                throw pecEmployeeCostError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_plan_enrollment_cost", {
                  p_enrollment_id: pecEnrollmentID,
                  p_cost_period_start: parseDate(row["Effective Date"] || row["cost_period_start"]) || new Date().toISOString().split("T")[0],
                  p_cost_period_end: parseDate(row["Expiry Date"] || row["cost_period_end"]) || new Date().toISOString().split("T")[0],
                  p_employee_cost: pecEmployeeCostVal ? Number.parseFloat(pecEmployeeCostVal) : null,
                  p_employer_cost: (row["Employer Cost"] || row["employer_cost"]) ? Number.parseFloat(row["Employer Cost"] || row["employer_cost"]) : null,
                  p_total_cost: (row["Plan Cost"] || row["total_cost"]) ? Number.parseFloat(row["Plan Cost"] || row["total_cost"]) : null,
                  p_coverage_id: row["coverage_id"] || null,
                  p_category_code: row["category_code"] || null,
                  p_benefit_class: row["benefit_class"] || null,
                  p_measurement_type: row["measurement_type"] || null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            case "Payroll_Hours":
              const phCompanyCode = row["Company Code"] || row["company_code"]
              const phEmployeeID = row["Employee_ID"] || row["employee_id"]

              if (!phCompanyCode || !phCompanyCode.trim()) throw { rowNumber, rowData: row, error: "Missing: Company Code", errorType: "missing_field" } as RowError
              if (!phEmployeeID || !phEmployeeID.trim()) throw { rowNumber, rowData: row, error: "Missing: Employee_ID", errorType: "missing_field" } as RowError

              const phHoursVal = row["Hours_Service"] || row["hours_service"] || row["hours_worked"]
              const phHoursError = validateNumericField(phHoursVal || "", "Hours_Service")
              if (phHoursVal && phHoursError) {
                phHoursError.rowNumber = rowNumber
                phHoursError.rowData = row
                throw phHoursError
              }

              const normalizedEmployeeId = normalizeEmployeeId(phEmployeeID) // Use normalized ID to avoid FK violations

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_payroll_hours", {
                  p_company_code: phCompanyCode,
                  p_employee_id: normalizedEmployeeId,
                  p_pay_period_start: parseDate(row["Pay_Period_Start"] || row["pay_period_start"]) || new Date().toISOString().split("T")[0],
                  p_pay_period_end: parseDate(row["Pay_Period_End"] || row["pay_period_end"]) || new Date().toISOString().split("T")[0],
                  p_hours_worked: phHoursVal ? Number.parseFloat(phHoursVal) : null,
                  p_regular_hours: (row["Regular_Hours"] || row["regular_hours"]) ? Number.parseFloat(row["Regular_Hours"] || row["regular_hours"]) : (phHoursVal ? Number.parseFloat(phHoursVal) : null),
                  p_overtime_hours: row["overtime_hours"] ? Number.parseFloat(row["overtime_hours"]) : null,
                  p_gross_wages: (row["Gross_Wages"] || row["gross_wages"]) ? Number.parseFloat(row["Gross_Wages"] || row["gross_wages"]) : null,
                  p_month: (row["Month"] || row["month"]) ? Number.parseInt(row["Month"] || row["month"]) : null,
                  p_add_name: row["Add Name"] || row["add_name"] || null,
                  p_add_date: parseDate(row["Add Date"] || row["add_date"]),
                  p_modified_by: row["modified_by"] || null,
                  p_modified_on: parseDate(row["modified_on"]),
                }),
              )
              break

            default:
              throw new Error(`Unknown file type: ${type}`)
          }

          const rowTime = performance.now() - rowStartTime
          rowTimings.push(rowTime)

          const rpcData = result?.data as any

          if (result?.error || (rpcData && rpcData.success === false)) {
            failedRows++

            const message = result?.error?.message || rpcData?.error || "Stored procedure returned success=false"

            const detailedError: RowError = {
              rowNumber,
              rowData: row,
              error: message,
              errorType: "database",
              field: result?.error?.details || undefined,
              expectedValue: "Valid data that passes database constraints",
              receivedValue: JSON.stringify(row, null, 2),
            }

            console.error(`[v0] Row ${rowNumber} failed: ${message}`)
            detailedErrors.push(detailedError)
          } else {
            processedRows++
            if (rowNumber % 50 === 0) {
              console.log(
                `[v0] Progress: ${rowNumber}/${rows.length} rows processed (${((rowNumber / rows.length) * 100).toFixed(1)}%)`,
              )
            }
          }

          return { success: !result?.error, rowNumber, time: rowTime }
        } catch (error) {
          failedRows++
          const rowTime = performance.now() - rowStartTime
          rowTimings.push(rowTime)

          if (error && typeof error === "object" && "errorType" in error) {
            const validationError = error as RowError
            console.error(`[v0] Row ${rowNumber} validation failed: ${validationError.error}`)
            detailedErrors.push(validationError)
          } else {
            const detailedError: RowError = {
              rowNumber,
              rowData: row,
              error: error instanceof Error ? error.message : "Unknown error",
              errorType: "database",
              expectedValue: "Valid request to database",
              receivedValue: JSON.stringify(row, null, 2),
            }
            console.error(`[v0] Row ${rowNumber} failed: ${detailedError.error}`)
            detailedErrors.push(detailedError)
          }

          return { success: false, rowNumber, time: rowTime, error }
        }
      })

      await Promise.all(batchPromises)
    }

    const dbTime = performance.now() - dbStartTime
    const totalTime = performance.now() - importStartTime

    const avgRowTime = rowTimings.length > 0 ? rowTimings.reduce((a, b) => a + b, 0) / rowTimings.length : 0
    const minRowTime = rowTimings.length > 0 ? Math.min(...rowTimings) : 0
    const maxRowTime = rowTimings.length > 0 ? Math.max(...rowTimings) : 0

    console.log("[v0] ========== IMPORT SUMMARY ==========")
    console.log(`[v0] File: ${file.name}`)
    console.log(`[v0] Type: ${type}`)
    console.log(`[v0] Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`[v0] Parse time: ${parseTime.toFixed(2)}ms`)
    console.log(`[v0] Database time: ${dbTime.toFixed(2)}ms`)
    console.log(`[v0] Total rows: ${rows.length}`)
    console.log(`[v0] Successful: ${processedRows}`)
    console.log(`[v0] Failed: ${failedRows}`)
    console.log(`[v0] Avg row time: ${avgRowTime.toFixed(2)}ms`)
    console.log(`[v0] Min row time: ${minRowTime.toFixed(2)}ms`)
    console.log(`[v0] Max row time: ${maxRowTime.toFixed(2)}ms`)
    console.log(`[v0] Throughput: ${((rows.length / totalTime) * 1000).toFixed(2)} rows/second`)

    if (detailedErrors.length > 0) {
      console.error(`[v0] Detailed Errors (${detailedErrors.length} total):`)
      detailedErrors.slice(0, 5).forEach((err) => {
        console.error(`[v0]   Row ${err.rowNumber} [${err.errorType}]: ${err.error}`)
        if (err.field) console.error(`[v0]     Field: ${err.field}`)
        if (err.expectedValue) console.error(`[v0]     Expected: ${err.expectedValue}`)
        if (err.receivedValue) console.error(`[v0]     Received: ${err.receivedValue}`)
      })
      if (detailedErrors.length > 5) {
        console.error(`[v0]   ... and ${detailedErrors.length - 5} more errors`)
      }
    }

    console.log("[v0] ========================================")

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: type,
      processedRows,
      totalRows: rows.length,
      failedRows,
      errors: detailedErrors.length > 0 ? detailedErrors : undefined,
      performance: {
        totalTimeMs: Math.round(totalTime),
        parseTimeMs: Math.round(parseTime),
        dbTimeMs: Math.round(dbTime),
        avgRowTimeMs: Math.round(avgRowTime),
        throughput: Math.round((rows.length / totalTime) * 1000),
      },
    })
  } catch (error) {
    const totalTime = performance.now() - importStartTime
    console.error("[v0] ========== IMPORT FAILED ==========")
    console.error("[v0] Error:", error)
    console.error(`[v0] Failed after ${totalTime.toFixed(2)}ms`)
    console.error("[v0] ======================================")

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    )
  }
}
