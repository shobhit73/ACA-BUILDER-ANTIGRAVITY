import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Fetching data from all derived tables...")

    const [
      dailyStatus,
      monthlyStatus,
      dailyEligibility,
      monthlyEligibility,
      dailyEnrollment,
      monthlyEnrollment,
      dailyDepEnrollment,
      monthlyDepEnrollment,
    ] = await Promise.all([
      supabase.from("employee_status_daily").select("*").order("employee_id").order("date"),
      supabase.from("employee_status_monthly").select("*").order("employee_id").order("month_start"),
      supabase.from("eligibility_daily").select("*").order("employee_id").order("date"),
      supabase.from("eligibility_monthly").select("*").order("employee_id").order("month_start"),
      supabase.from("enrollment_daily").select("*").order("employee_id").order("date"),
      supabase.from("enrollment_monthly").select("*").order("employee_id").order("month_start").order("plancode"),
      supabase.from("dependent_enrollment_daily").select("*").order("employee_id").order("dependent_id").order("date"),
      supabase
        .from("dependent_enrollment_monthly")
        .select("*")
        .order("employee_id")
        .order("dependent_id")
        .order("month_start"),
    ])

    if (dailyStatus.error) throw dailyStatus.error
    if (monthlyStatus.error) throw monthlyStatus.error
    if (dailyEligibility.error) throw dailyEligibility.error
    if (monthlyEligibility.error) throw monthlyEligibility.error
    if (dailyEnrollment.error) throw dailyEnrollment.error
    if (monthlyEnrollment.error) throw monthlyEnrollment.error
    if (dailyDepEnrollment.error) throw dailyDepEnrollment.error
    if (monthlyDepEnrollment.error) throw monthlyDepEnrollment.error

    console.log("[v0] Data fetched successfully")
    console.log(`[v0] Daily status: ${dailyStatus.data.length} rows`)
    console.log(`[v0] Monthly status: ${monthlyStatus.data.length} rows`)
    console.log(`[v0] Daily eligibility: ${dailyEligibility.data.length} rows`)
    console.log(`[v0] Monthly eligibility: ${monthlyEligibility.data.length} rows`)
    console.log(`[v0] Daily enrollment: ${dailyEnrollment.data.length} rows`)
    console.log(`[v0] Monthly enrollment: ${monthlyEnrollment.data.length} rows`)
    console.log(`[v0] Daily dependent enrollment: ${dailyDepEnrollment.data.length} rows`)
    console.log(`[v0] Monthly dependent enrollment: ${monthlyDepEnrollment.data.length} rows`)

    // Return raw JSON data for client-side generation
    return NextResponse.json({
      dailyStatus: dailyStatus.data,
      monthlyStatus: monthlyStatus.data,
      dailyEligibility: dailyEligibility.data,
      monthlyEligibility: monthlyEligibility.data,
      dailyEnrollment: dailyEnrollment.data,
      monthlyEnrollment: monthlyEnrollment.data,
      dailyDepEnrollment: dailyDepEnrollment.data,
      monthlyDepEnrollment: monthlyDepEnrollment.data,
    })
  } catch (e: any) {
    console.error("[v0] Download error:", e)
    return NextResponse.json({ error: e?.message ?? "Download failed" }, { status: 500 })
  }
}
