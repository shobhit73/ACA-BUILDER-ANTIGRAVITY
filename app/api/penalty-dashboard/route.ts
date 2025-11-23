import { NextResponse } from "next/server"
import { generatePenaltyDashboard } from "@/app/actions/generate-penalty-dashboard"
import ExcelJS from "exceljs"

/**
 * 📊 PENALTY DASHBOARD EXCEL EXPORT API
 *
 * This API endpoint generates a professionally formatted Excel file with penalty data.
 * The Excel file is designed to be presentation-ready for management and compliance teams.
 *
 * 🎯 WHAT THIS FILE DOES:
 * 1. Calls generatePenaltyDashboard() to calculate penalties
 * 2. Creates an Excel workbook using ExcelJS library
 * 3. Formats the data with colors, borders, and styling
 * 4. Adds a summary section with totals
 * 5. Returns the Excel file for download
 *
 * 📊 EXCEL FILE STRUCTURE:
 *
 * **Header Row (Row 1):**
 * - Blue background (#4472C4)
 * - White text, bold
 * - Columns: Employee ID, Employee Name, Penalty Type, Department, Reason, Total, Jan-Dec
 *
 * **Data Rows:**
 * - Employee information and monthly penalties
 * - Penalty A rows: Light red background (#FFC7CE)
 * - Penalty B rows: Light orange background (#FFEB9C)
 * - No Penalty rows: No special formatting
 * - Monthly amounts: "$241.67" or "$362.50" or "-"
 * - Total column: Sum of all monthly penalties
 *
 * **Summary Section (Bottom):**
 * - Blank rows for spacing
 * - "SUMMARY" header (bold, size 14)
 * - Total Penalties: Grand total with light blue background
 * - Total Penalty A: Sum with light red background
 * - Total Penalty B: Sum with light orange background
 *
 * 🎨 COLOR CODING:
 * - Blue (#4472C4): Header row
 * - Light Red (#FFC7CE): Penalty A
 * - Light Orange (#FFEB9C): Penalty B
 * - Light Blue (#D9E1F2): Grand total
 *
 * 💡 WHY EXCELJS?
 * - Creates native Excel files (.xlsx)
 * - Supports advanced formatting (colors, fonts, borders)
 * - Better than CSV for presentation
 * - Can be opened directly in Excel without import
 *
 * 🚀 USAGE:
 * This report is used for:
 * - Executive presentations
 * - Compliance reviews
 * - Budget planning (penalty estimates)
 * - Decision-making on plan affordability
 *
 * 📈 EXAMPLE OUTPUT:
 * \`\`\`
 * Employee ID | Employee Name | Penalty Type | Department | Reason                    | Total   | Jan      | Feb      | ... | Dec
 * ------------|---------------|--------------|------------|---------------------------|---------|----------|----------|-----|----------
 * EMP001      | Jane Doe      | Penalty A    | HR         | No MEC offered            | $2,900.04| $241.67  | $241.67  | ... | $241.67
 * EMP002      | John Smith    | Penalty B    | Finance    | Unaffordable (cost: $75)  | $4,350.00| $362.50  | $362.50  | ... | $362.50
 * EMP003      | Alice Johnson | No Penalty   | IT         | Affordable coverage       | $0.00   | -        | -        | ... | -
 *
 * SUMMARY
 * Total Penalties: $7,250.04
 * Total Penalty A: $2,900.04
 * Total Penalty B: $4,350.00
 * \`\`\`
 *
 * @route GET /api/penalty-dashboard?year=2024
 * @param year - Tax year (query parameter, defaults to 2024)
 * @returns Excel file (.xlsx) with formatted penalty dashboard
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = Number.parseInt(searchParams.get("year") || "2024")

    const penaltyData = await generatePenaltyDashboard(year)

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(`Penalty Dashboard ${year}`)

    worksheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 15 },
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "Penalty Type", key: "penaltyType", width: 15 },
      { header: "Department", key: "department", width: 20 },
      { header: "Reason", key: "reason", width: 60 },
      { header: "Total", key: "total", width: 15 },
      { header: "Jan", key: "jan", width: 12 },
      { header: "Feb", key: "feb", width: 12 },
      { header: "Mar", key: "mar", width: 12 },
      { header: "Apr", key: "apr", width: 12 },
      { header: "May", key: "may", width: 12 },
      { header: "Jun", key: "jun", width: 12 },
      { header: "Jul", key: "jul", width: 12 },
      { header: "Aug", key: "aug", width: 12 },
      { header: "Sep", key: "sep", width: 12 },
      { header: "Oct", key: "oct", width: 12 },
      { header: "Nov", key: "nov", width: 12 },
      { header: "Dec", key: "dec", width: 12 },
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }
    headerRow.alignment = { vertical: "middle", horizontal: "center" }

    let totalPenaltyA = 0
    let totalPenaltyB = 0

    for (const emp of penaltyData) {
      const row = worksheet.addRow({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        penaltyType: emp.penaltyType,
        department: emp.department,
        reason: emp.reason,
        total: `$${emp.totalPenalty.toFixed(2)}`,
        jan: emp.monthlyPenalties[0] ? `$${emp.monthlyPenalties[0].toFixed(2)}` : "-",
        feb: emp.monthlyPenalties[1] ? `$${emp.monthlyPenalties[1].toFixed(2)}` : "-",
        mar: emp.monthlyPenalties[2] ? `$${emp.monthlyPenalties[2].toFixed(2)}` : "-",
        apr: emp.monthlyPenalties[3] ? `$${emp.monthlyPenalties[3].toFixed(2)}` : "-",
        may: emp.monthlyPenalties[4] ? `$${emp.monthlyPenalties[4].toFixed(2)}` : "-",
        jun: emp.monthlyPenalties[5] ? `$${emp.monthlyPenalties[5].toFixed(2)}` : "-",
        jul: emp.monthlyPenalties[6] ? `$${emp.monthlyPenalties[6].toFixed(2)}` : "-",
        aug: emp.monthlyPenalties[7] ? `$${emp.monthlyPenalties[7].toFixed(2)}` : "-",
        sep: emp.monthlyPenalties[8] ? `$${emp.monthlyPenalties[8].toFixed(2)}` : "-",
        oct: emp.monthlyPenalties[9] ? `$${emp.monthlyPenalties[9].toFixed(2)}` : "-",
        nov: emp.monthlyPenalties[10] ? `$${emp.monthlyPenalties[10].toFixed(2)}` : "-",
        dec: emp.monthlyPenalties[11] ? `$${emp.monthlyPenalties[11].toFixed(2)}` : "-",
      })

      if (emp.penaltyType === "Penalty A") {
        row.getCell("penaltyType").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        }
        totalPenaltyA += emp.totalPenalty
      } else if (emp.penaltyType === "Penalty B") {
        row.getCell("penaltyType").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB9C" },
        }
        totalPenaltyB += emp.totalPenalty
      }

      for (let col = 6; col <= 18; col++) {
        row.getCell(col).alignment = { horizontal: "center" }
      }
    }

    worksheet.addRow([])
    worksheet.addRow([])
    const summaryRow1 = worksheet.addRow(["SUMMARY"])
    summaryRow1.font = { bold: true, size: 14 }

    const summaryRow2 = worksheet.addRow(["Total Penalties:", `$${(totalPenaltyA + totalPenaltyB).toFixed(2)}`])
    summaryRow2.font = { bold: true, size: 12 }
    summaryRow2.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }

    const summaryRow3 = worksheet.addRow(["Total Penalty A:", `$${totalPenaltyA.toFixed(2)}`])
    summaryRow3.font = { bold: true }
    summaryRow3.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" },
    }

    const summaryRow4 = worksheet.addRow(["Total Penalty B:", `$${totalPenaltyB.toFixed(2)}`])
    summaryRow4.font = { bold: true }
    summaryRow4.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFEB9C" },
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Penalty_Dashboard_${year}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("[v0] Penalty dashboard generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate penalty dashboard" },
      { status: 500 },
    )
  }
}
