import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const searchParams = request.nextUrl.searchParams
  const tableName = searchParams.get("tableName")
  const taxYear = searchParams.get("taxYear")
  const companyCode = searchParams.get("companyCode")

  console.log(`[v0] Starting download for table: ${tableName}, company: ${companyCode}, tax year: ${taxYear}`)

  if (!tableName || !taxYear || !companyCode) {
    return NextResponse.json(
      { success: false, error: "Table name, company code, and tax year are required" },
      { status: 400 },
    )
  }

  const validTables = ["aca_employee_monthly_status", "aca_employee_monthly_offer", "aca_employee_monthly_enrollment"]

  if (!validTables.includes(tableName)) {
    return NextResponse.json({ success: false, error: "Invalid table name" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    let retries = 3
    let data: any
    let error: any

    while (retries > 0) {
      const result = await supabase
        .from(tableName)
        .select("*")
        .eq("company_code", companyCode)
        .eq("tax_year", taxYear)
        .order("employee_id")
        .order("month")

      data = result.data
      error = result.error

      // Check if it's a rate limit error
      if (error && error.message && error.message.includes("Too Many Requests")) {
        console.warn(`[v0] Rate limit hit during download, retrying... (${retries} retries left)`)
        retries--
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
          continue
        }
      }

      break
    }

    if (error) {
      console.error(`[v0] Error fetching data from ${tableName}:`, error)
      return NextResponse.json({ success: false, error: `Failed to fetch data: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.warn(`[v0] No data found in ${tableName} for company ${companyCode}, tax year ${taxYear}`)
      return NextResponse.json(
        {
          success: false,
          error: `No data found for company ${companyCode}, tax year ${taxYear}. Please generate the interim tables first.`,
        },
        { status: 404 },
      )
    }

    console.log(`[v0] Retrieved ${data.length} rows from ${tableName}`)

    // Convert to CSV
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(",")]

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header]
        // Handle null/undefined
        if (value === null || value === undefined) return ""
        // Escape values containing commas or quotes
        const stringValue = String(value)
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csvRows.push(values.join(","))
    }

    const csv = csvRows.join("\n")
    const downloadTime = performance.now() - startTime

    console.log(`[v0] Generated CSV with ${data.length} rows in ${downloadTime.toFixed(2)}ms`)

    const fileName = `${tableName}_${companyCode}_${taxYear}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    const totalTime = performance.now() - startTime
    console.error(`[v0] Error downloading ${tableName} after ${totalTime.toFixed(2)}ms:`, error)
    return NextResponse.json({ success: false, error: error.message || "Failed to download data" }, { status: 500 })
  }
}
