import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import ExcelJS from "exceljs"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const companyCode = searchParams.get("companyCode")
        const taxYear = searchParams.get("taxYear")

        if (!companyCode || !taxYear) {
            return NextResponse.json({ success: false, error: "Company code and tax year are required" }, { status: 400 })
        }

        const supabase = await createClient()

        // Fetch all data for export
        const { data, error } = await supabase
            .from("aca_final_report")
            .select(
                `
        *,
        employee_census!inner (
          first_name,
          last_name,
          ssn
        )
      `,
            )
            .eq("company_code", companyCode)
            .eq("tax_year", taxYear)
            .order("employee_id", { ascending: true })
            .order("month", { ascending: true })

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ success: false, error: "No data found to export" }, { status: 404 })
        }

        // Create Workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet("ACA Monthly Codes")

        // Define Columns
        worksheet.columns = [
            { header: "Employee ID", key: "employee_id", width: 15 },
            { header: "First Name", key: "first_name", width: 20 },
            { header: "Last Name", key: "last_name", width: 20 },
            { header: "Month", key: "month", width: 10 },
            { header: "Line 14 (Offer)", key: "line_14", width: 15 },
            { header: "Line 15 (Cost)", key: "line_15", width: 15 },
            { header: "Line 16 (Safe Harbor)", key: "line_16", width: 20 },
        ]

        // Add Data
        data.forEach((record: any) => {
            worksheet.addRow({
                employee_id: record.employee_id,
                first_name: record.employee_census?.first_name,
                last_name: record.employee_census?.last_name,
                month: record.month,
                line_14: record.line_14_code,
                line_15: record.line_15_cost,
                line_16: record.line_16_code,
            })
        })

        // Style Header
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFCCE5FF" }, // Light Blue
        }

        // Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer()

        // Return Response
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="ACA_Report_${companyCode}_${taxYear}.xlsx"`,
            },
        })
    } catch (error: any) {
        console.error("[ACA Report] Export error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
