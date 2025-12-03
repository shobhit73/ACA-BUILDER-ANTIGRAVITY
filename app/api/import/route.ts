import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Helper to parse CSV
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ""
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
              validationError = validateRequiredFields(row, ["Company Code", "Company Name"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_company_details", {
                  p_company_code: row["Company Code"],
                  p_company_name: row["Company Name"],
                  p_dba_name: row["DBA Name"] || null,
                  p_ein: row["Company EIN"] || null,
                  p_address_line_1: row["Address Line 1"] || null,
                  p_address_line_2: row["Address Line 2"] || null,
                  p_city: row["City"] || null,
                  p_state: row["State"] || null,
                  p_zip_code: row["Zip"] || null,
                  p_country: row["Country"] || null,
                  p_contact_name: row["Contact Name"] || null,
                  p_contact_phone: row["Phone Number"] || null,
                  p_contact_email: row["Contact Email"] || null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Plan_Master":
              validationError = validateRequiredFields(row, ["Company Code", "Plan Code", "Plan Name"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_plan_master", {
                  p_company_code: row["Company Code"],
                  p_plan_code: row["Plan Code"],
                  p_plan_name: row["Plan Name"],
                  p_plan_type: row["Plan Type"] || null,
                  p_mvc: parseBooleanYN(row["MVC"]),
                  p_me: parseBooleanYN(row["ME"]),
                  p_plan_affordable_cost: row["Plan Affordable Cost"]
                    ? Number.parseFloat(row["Plan Affordable Cost"])
                    : null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Employee_Census":
              validationError = validateRequiredFields(row, ["Company Code", "EmployeeID", "First Name", "Last Name"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              const fteError = validateNumericField(row["Full Time Equivalent"], "Full Time Equivalent")
              if (fteError) {
                fteError.rowNumber = rowNumber
                fteError.rowData = row
                throw fteError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_census", {
                  p_company_code: row["Company Code"],
                  p_employee_id: row["EmployeeID"],
                  p_first_name: row["First Name"],
                  p_middle_name: row["Middle Initial"] || null,
                  p_last_name: row["Last Name"],
                  p_ssn: row["SSN"] || null,
                  p_date_of_birth: parseDate(row["Date of Birth"]),
                  p_gender: row["Gender"] || null,
                  p_hire_date: parseDate(row["Start Date"]),
                  p_termination_date: parseDate(row["End Date"]),
                  p_employment_status: row["Employee Status Code"] || null,
                  p_job_title: row["Job Title"] || null,
                  p_department: row["Department"] || null,
                  p_full_time_equivalent: row["Full Time Equivalent"]
                    ? Number.parseFloat(row["Full Time Equivalent"])
                    : null,
                  p_pay_frequency: transformPayFrequency(row["Pay Frequency"]),
                  p_employment_type_code: transformEmploymentType(row["Employment Type Code"]),
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Employee_Address":
              validationError = validateRequiredFields(row, ["Company Code", "EmployeeID"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_address", {
                  p_company_code: row["Company Code"],
                  p_employee_id: row["EmployeeID"],
                  p_effective_date: parseDate(row["Address Start Date"]) || new Date().toISOString().split("T")[0],
                  p_address_line_1: row["AddressLine1"] || null,
                  p_address_line_2: row["Address Line 2"] || null,
                  p_city: row["City"] || null,
                  p_state: row["State"] || null,
                  p_zip_code: row["ZipCode"] || null,
                  p_county: row["County"] || null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Employee_Waiting_Period":
              validationError = validateRequiredFields(row, ["Company Code", "EmployeeID"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_waiting_period", {
                  p_company_code: row["Company Code"],
                  p_employee_id: row["EmployeeID"],
                  p_waiting_period_end_date: parseDate(row["Effective Date"]),
                  p_is_waiting_period_waived: parseBoolean(row["Is Waiting Period Waived"]),
                  p_waiver_reason: row["Waiver Reason"] || null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Employee_Plan_Eligibility":
              validationError = validateRequiredFields(row, ["Company Code", "EmployeeID", "Plan Code"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              const normalizedEligibilityEmployeeId = normalizeEmployeeId(row["EmployeeID"])

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_plan_eligibility", {
                  p_company_code: row["Company Code"],
                  p_employee_id: normalizedEligibilityEmployeeId,
                  p_plan_code: String(row["Plan Code"]),
                  p_eligibility_start_date:
                    toDateString(parseDate(row["Effective Date"])) || new Date().toISOString().split("T")[0],
                  p_eligibility_end_date: toDateString(parseDate(row["Expiry Date"])),
                  p_eligibility_status: "Active",
                  p_benefit_class: row["Benefit Class"] || null,
                  p_measurement_type: row["Measurement_Type"] || null,
                  p_option_code: row["Option Code"] || null,
                  p_plan_cost: row["Plan Cost"] ? Number.parseFloat(row["Plan Cost"]) : null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: toDateString(parseDate(row["Add Date"])),
                }),
              )
              break

            case "Employee_Plan_Enrollment":
              validationError = validateRequiredFields(row, [
                "Enrollment ID",
                "Company Code",
                "EmployeeID",
                "Plan Code",
              ])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              const normalizedEnrollmentEmployeeId = normalizeEmployeeId(row["EmployeeID"])

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_plan_enrollment", {
                  p_enrollment_id: row["Enrollment ID"],
                  p_company_code: row["Company Code"],
                  p_employee_id: normalizedEnrollmentEmployeeId,
                  p_plan_code: String(row["Plan Code"]),
                  p_enrollment_date:
                    toDateString(parseDate(row["Event Date"])) || new Date().toISOString().split("T")[0],
                  p_effective_date:
                    toDateString(parseDate(row["Effective Date"])) || new Date().toISOString().split("T")[0],
                  p_termination_date: toDateString(parseDate(row["Expiry Date"])),
                  p_coverage_tier: row["Category Code"] || null,
                  p_enrollment_status: transformEnrollmentCode(row["Enrollment Code"]),
                  p_enrollment_event: row["Enrollment Event"] || null,
                  p_option_code: row["Option Code"] || null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: toDateString(parseDate(row["Add Date"])),
                }),
              )
              break

            case "Employee_Dependent":
              validationError = validateRequiredFields(row, [
                "Company Code",
                "EmployeeID",
                "DependentID",
                "First Name",
                "Last Name",
              ])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_employee_dependent", {
                  p_company_code: row["Company Code"],
                  p_employee_id: row["EmployeeID"],
                  p_dependent_id: row["DependentID"],
                  p_first_name: row["First Name"],
                  p_middle_name: row["Middle Initial"] || null,
                  p_last_name: row["Last Name"],
                  p_ssn: row["SSN"] || row["dependent_ssn"] || null,
                  p_date_of_birth: parseDate(row["Date of Birth"]),
                  p_gender: row["Gender"] || null,
                  p_relationship: row["Relationship Code"] || null,
                  p_is_disabled: parseBoolean(row["Is Disabled"]),
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Plan_Enrollment_Cost":
              validationError = validateRequiredFields(row, ["Enrollment ID"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              const employeeCostError = validateNumericField(row["Employee Cost"], "Employee Cost")
              if (employeeCostError) {
                employeeCostError.rowNumber = rowNumber
                employeeCostError.rowData = row
                throw employeeCostError
              }

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_plan_enrollment_cost", {
                  p_enrollment_id: row["Enrollment ID"],
                  p_cost_period_start: parseDate(row["Effective Date"]) || new Date().toISOString().split("T")[0],
                  p_cost_period_end: parseDate(row["Expiry Date"]) || new Date().toISOString().split("T")[0],
                  p_employee_cost: row["Employee Cost"] ? Number.parseFloat(row["Employee Cost"]) : null,
                  p_employer_cost: row["Employer Cost"] ? Number.parseFloat(row["Employer Cost"]) : null,
                  p_total_cost: row["Plan Cost"] ? Number.parseFloat(row["Plan Cost"]) : null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
                }),
              )
              break

            case "Payroll_Hours":
              validationError = validateRequiredFields(row, ["Company Code", "Employee_ID"])
              if (validationError) {
                validationError.rowNumber = rowNumber
                validationError.rowData = row
                throw validationError
              }

              const hoursError = validateNumericField(row["Hours_Service"], "Hours_Service")
              if (hoursError) {
                hoursError.rowNumber = rowNumber
                hoursError.rowData = row
                throw hoursError
              }

              const rawEmployeeId = row["Employee_ID"]
              const normalizedEmployeeId = normalizeEmployeeId(rawEmployeeId) // Use normalized ID to avoid FK violations

              result = await retryOperation(async () =>
                await supabase.rpc("upsert_payroll_hours", {
                  p_company_code: row["Company Code"],
                  p_employee_id: normalizedEmployeeId,
                  p_pay_period_start: parseDate(row["Pay_Period_Start"]) || new Date().toISOString().split("T")[0],
                  p_pay_period_end: parseDate(row["Pay_Period_End"]) || new Date().toISOString().split("T")[0],
                  p_hours_worked: row["Hours_Service"] ? Number.parseFloat(row["Hours_Service"]) : null,
                  p_regular_hours: row["Hours_Service"] ? Number.parseFloat(row["Hours_Service"]) : null,
                  p_overtime_hours: null,
                  p_gross_wages: row["Gross_Wages"] ? Number.parseFloat(row["Gross_Wages"]) : null,
                  p_month: row["Month"] ? Number.parseInt(row["Month"]) : null,
                  p_add_name: row["Add Name"] || null,
                  p_add_date: parseDate(row["Add Date"]),
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
