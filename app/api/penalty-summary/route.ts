import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import ExcelJS from "exceljs"

/**
 * 📊 PENALTY SUMMARY BY EMPLOYER - EXCEL EXPORT API
 *
 * This API endpoint generates an Excel file with penalty totals aggregated by employer.
 * Similar to a pivot table, it shows grand totals and employer-level breakdowns.
 *
 * 🎯 WHAT THIS FILE DOES:
 * 1. Fetches all employees grouped by employer (name + EIN)
 * 2. Calculates Penalty A and Penalty B for each employer
 * 3. Creates a professionally formatted Excel file
 * 4. Returns the file for download
 *
 * 📊 EXCEL FILE STRUCTURE:
 *
 * **Grand Total Section (Top):**
 * - Row 1: "GRAND TOTAL" header (bold, size 14, blue background)
 * - Row 2: Total Penalties (all employers combined)
 * - Row 3: Total Penalty A (all employers combined)
 * - Row 4: Total Penalty B (all employers combined)
 *
 * **Employer Breakdown Table:**
 * - Header Row: Employer Name | EIN | Employees | Total Penalty | Penalty A | Penalty B
 * - Data Rows: One row per employer with their totals
 * - Sorted by Total Penalty (descending)
 *
 * 🎨 COLOR CODING:
 * - Blue (#4472C4): Grand total section background
 * - Light Blue (#D9E1F2): Table header row
 * - Light Red (#FFC7CE): Penalty A amounts
 * - Light Orange (#FFEB9C): Penalty B amounts
 *
 * @route GET /api/penalty-summary?year=2025
 * @param year - Tax year (query parameter, defaults to 2025)
 * @returns Excel file (.xlsx) with employer penalty summary
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = Number.parseInt(searchParams.get("year") || "2025")

    const supabase = await createServerClient()

    // Monthly penalty amounts
    const PENALTY_A_AMOUNT = 241.67
    const PENALTY_B_AMOUNT = 362.5

    // Get all employees with their employer info
    const { data: employees, error } = await supabase.from("employee_details").select("employee_id, employer_name, ein")

    if (error || !employees) {
      throw new Error("Failed to fetch employees")
    }

    // Group employees by employer
    const employerMap = new Map<string, { name: string; ein: string; employees: string[] }>()

    for (const emp of employees) {
      const key = `${emp.employer_name || "Unknown"}_${emp.ein || "Unknown"}`
      if (!employerMap.has(key)) {
        employerMap.set(key, {
          name: emp.employer_name || "Unknown Employer",
          ein: emp.ein || "Unknown EIN",
          employees: [],
        })
      }
      employerMap.get(key)!.employees.push(emp.employee_id.toString())
    }

    // Calculate penalties for each employer
    interface EmployerSummary {
      name: string
      ein: string
      employeeCount: number
      totalPenalty: number
      penaltyA: number
      penaltyB: number
    }

    const employerSummaries: EmployerSummary[] = []
    let grandTotalPenalty = 0
    let grandTotalPenaltyA = 0
    let grandTotalPenaltyB = 0

    for (const [, employer] of employerMap) {
      let employerPenaltyA = 0
      let employerPenaltyB = 0

      // Process each employee
      for (const employeeId of employer.employees) {
        const yearStart = `${year}-01-01`
        const yearEnd = `${year}-12-31`

        // Get status, eligibility, and enrollment data
        const { data: statusData } = await supabase
          .from("employee_status_monthly")
          .select("month_start, is_full_time_full_month")
          .eq("employee_id", employeeId)
          .gte("month_start", yearStart)
          .lte("month_start", yearEnd)

        const { data: eligibilityData } = await supabase
          .from("eligibility_monthly")
          .select("month_start, employee_eligible_full_month, plan_cost")
          .eq("employee_id", employeeId)
          .gte("month_start", yearStart)
          .lte("month_start", yearEnd)

        const { data: enrollmentData } = await supabase
          .from("enrollment_monthly")
          .select("month_start, employee_enrolled, plancode")
          .eq("employee_id", employeeId)
          .gte("month_start", yearStart)
          .lte("month_start", yearEnd)

        // Create lookup maps
        const statusMap = new Map((statusData || []).map((s) => [new Date(s.month_start).getMonth(), s]))
        const eligibilityMap = new Map((eligibilityData || []).map((e) => [new Date(e.month_start).getMonth(), e]))
        const enrollmentMap = new Map((enrollmentData || []).map((e) => [new Date(e.month_start).getMonth(), e]))

        // Calculate penalties for each month
        for (let month = 0; month < 12; month++) {
          const status = statusMap.get(month)
          const eligibility = eligibilityMap.get(month)
          const enrollment = enrollmentMap.get(month)

          const isFullTime = status?.is_full_time_full_month || false
          const isEligible = eligibility?.employee_eligible_full_month || false
          const planCost = eligibility?.plan_cost || 0
          const isWaived = enrollment?.plancode === "Waive"

          // Penalty A: No coverage offered
          if (isFullTime && !isEligible) {
            employerPenaltyA += PENALTY_A_AMOUNT
          }
          // Penalty B: Unaffordable coverage offered and waived
          else if (isFullTime && isEligible && planCost > 50 && isWaived) {
            employerPenaltyB += PENALTY_B_AMOUNT
          }
        }
      }

      const totalPenalty = employerPenaltyA + employerPenaltyB

      employerSummaries.push({
        name: employer.name,
        ein: employer.ein,
        employeeCount: employer.employees.length,
        totalPenalty,
        penaltyA: employerPenaltyA,
        penaltyB: employerPenaltyB,
      })

      grandTotalPenalty += totalPenalty
      grandTotalPenaltyA += employerPenaltyA
      grandTotalPenaltyB += employerPenaltyB
    }

    // Sort by total penalty descending
    employerSummaries.sort((a, b) => b.totalPenalty - a.totalPenalty)

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(`Penalty Summary ${year}`)

    // Set column widths
    worksheet.columns = [
      { header: "Employer Name", key: "employerName", width: 40 },
      { header: "EIN", key: "ein", width: 20 },
      { header: "Employees", key: "employees", width: 15 },
      { header: "Total Penalty", key: "totalPenalty", width: 18 },
      { header: "Penalty A", key: "penaltyA", width: 18 },
      { header: "Penalty B", key: "penaltyB", width: 18 },
    ]

    // Grand Total Section
    const titleRow = worksheet.addRow(["GRAND TOTAL"])
    titleRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }
    worksheet.mergeCells(1, 1, 1, 6)

    const grandTotalRow = worksheet.addRow([
      "Total Penalties (All Employers)",
      "",
      "",
      `$${grandTotalPenalty.toFixed(2)}`,
      "",
      "",
    ])
    grandTotalRow.font = { bold: true, size: 12 }
    grandTotalRow.getCell(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }

    const penaltyARow = worksheet.addRow(["Total Penalty A", "", "", "", `$${grandTotalPenaltyA.toFixed(2)}`, ""])
    penaltyARow.font = { bold: true }
    penaltyARow.getCell(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" },
    }

    const penaltyBRow = worksheet.addRow(["Total Penalty B", "", "", "", "", `$${grandTotalPenaltyB.toFixed(2)}`])
    penaltyBRow.font = { bold: true }
    penaltyBRow.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFEB9C" },
    }

    // Add blank rows
    worksheet.addRow([])
    worksheet.addRow([])

    // Employer breakdown table header
    const headerRow = worksheet.addRow(["Employer Name", "EIN", "Employees", "Total Penalty", "Penalty A", "Penalty B"])
    headerRow.font = { bold: true, color: { argb: "FF000000" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }
    headerRow.alignment = { vertical: "middle", horizontal: "center" }

    // Add employer data rows
    for (const employer of employerSummaries) {
      const row = worksheet.addRow([
        employer.name,
        employer.ein,
        employer.employeeCount,
        `$${employer.totalPenalty.toFixed(2)}`,
        `$${employer.penaltyA.toFixed(2)}`,
        `$${employer.penaltyB.toFixed(2)}`,
      ])

      // Right-align numeric columns
      row.getCell(3).alignment = { horizontal: "center" }
      row.getCell(4).alignment = { horizontal: "right" }
      row.getCell(5).alignment = { horizontal: "right" }
      row.getCell(6).alignment = { horizontal: "right" }

      // Color code penalty amounts
      if (employer.penaltyA > 0) {
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        }
      }
      if (employer.penaltyB > 0) {
        row.getCell(6).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB9C" },
        }
      }
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Penalty_Summary_by_Employer_${year}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("[v0] Penalty summary generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate penalty summary" },
      { status: 500 },
    )
  }
}
