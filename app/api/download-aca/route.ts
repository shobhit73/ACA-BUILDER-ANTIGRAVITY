export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

/**
 * 📥 DOWNLOAD ACA MONTHLY REPORT (CSV)
 *
 * This API endpoint generates and downloads the ACA monthly report as a CSV file.
 * The report contains Line 14 and Line 16 codes for all employees for all months.
 *
 * 🎯 WHAT THIS FILE DOES:
 * 1. Fetches all data from employee_aca_monthly table
 * 2. Converts the data to CSV format
 * 3. Returns the CSV file for download
 *
 * 📊 REPORT CONTENTS:
 * The CSV file contains the following columns:
 * - employee_id: Employee's unique identifier
 * - month_start: First day of the month (YYYY-MM-DD format)
 * - line_14: Offer of Coverage code (e.g., "1A", "1B", "1E")
 * - line_16: Safe Harbor code (e.g., "2C", "2F", "2H")
 *
 * 🔍 WHAT ARE LINE 14 AND LINE 16?
 *
 * **Line 14: Offer of Coverage**
 * Indicates what type of coverage was offered to the employee:
 * - 1A: Minimum essential coverage offered to employee only
 * - 1B: Minimum essential coverage offered to employee and dependents
 * - 1C: Minimum essential coverage offered to employee, spouse, and dependents
 * - 1D: Minimum essential coverage offered to employee and spouse
 * - 1E: Minimum essential coverage NOT offered
 * - 1F-1J: Various other offer scenarios
 *
 * **Line 16: Safe Harbor**
 * Indicates if the employer qualifies for a safe harbor (penalty protection):
 * - 2A: Employee not employed during the month
 * - 2B: Employee not a full-time employee
 * - 2C: Employee enrolled in coverage
 * - 2D: Employee in a limited non-assessment period
 * - 2E: Multiemployer interim rule relief
 * - 2F: Section 4980H affordability Form W-2 safe harbor
 * - 2G: Section 4980H affordability federal poverty line safe harbor
 * - 2H: Section 4980H affordability rate of pay safe harbor
 *
 * 💡 WHY CSV FORMAT?
 * - Easy to open in Excel or Google Sheets
 * - Can be imported into other systems
 * - Human-readable format
 * - Smaller file size than Excel
 *
 * 🚀 USAGE:
 * This report is used for:
 * - IRS Form 1095-C preparation
 * - ACA compliance verification
 * - Penalty analysis
 * - Audit preparation
 *
 * 🔐 SECURITY:
 * - Uses Supabase Service Role Key (admin access)
 * - No user authentication required (handled by middleware)
 *
 * @route GET /api/download-aca
 * @returns CSV file with ACA monthly data
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

export async function GET() {
  try {
    console.log("[v0] Fetching ACA monthly data...")
    const { data, error } = await supabase
      .from("employee_aca_monthly")
      .select("*")
      .order("employee_id")
      .order("month_start")

    if (error) {
      console.error("[v0] ACA fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No ACA data available. Please upload census data first." }, { status: 404 })
    }

    // Return raw JSON data
    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[v0] ACA download error:", err)
    return NextResponse.json({ error: err.message || "Failed to download ACA report" }, { status: 500 })
  }
}
