import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  console.log("[v0] Starting ACA interim table generation")

  try {
    const { taxYear, companyCode } = await request.json()

    if (!taxYear || isNaN(taxYear)) {
      return NextResponse.json({ success: false, error: "Valid tax year is required" }, { status: 400 })
    }

    if (!companyCode) {
      return NextResponse.json({ success: false, error: "Company code is required" }, { status: 400 })
    }

    console.log(`[v0] Generating interim tables for company: ${companyCode}, tax year: ${taxYear}`)

    const supabase = await createClient()

    console.log("[v0] Checking source data availability...")

    const { count: empCount, error: empError } = await supabase
      .from("employee_census")
      .select("*", { count: "exact", head: true })
      .eq("company_code", companyCode)

    const { count: payrollCount, error: payrollError } = await supabase
      .from("payroll_hours")
      .select("*", { count: "exact", head: true })
      .eq("company_code", companyCode)

    const { count: eligibilityCount, error: eligibilityError } = await supabase
      .from("employee_plan_eligibility")
      .select("*", { count: "exact", head: true })
      .eq("company_code", companyCode)

    const { count: enrollmentCount, error: enrollmentError } = await supabase
      .from("employee_plan_enrollment")
      .select("*", { count: "exact", head: true })
      .eq("company_code", companyCode)

    console.log("[v0] Source data counts:", {
      employees: empCount || 0,
      payrollHours: payrollCount || 0,
      eligibility: eligibilityCount || 0,
      enrollment: enrollmentCount || 0,
    })

    if (!empCount || empCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No employee census data found for company ${companyCode}. Please import employee data first.`,
        },
        { status: 400 },
      )
    }

    let retries = 3
    let procResult: any
    let procError: any

    while (retries > 0) {
      const result = await supabase.rpc("generate_aca_monthly_interim", {
        p_company_code: companyCode,
        p_tax_year: taxYear,
      })

      procResult = result.data
      procError = result.error

      if (procError && procError.message && procError.message.includes("Too Many Requests")) {
        console.warn(`[v0] Rate limit hit, retrying... (${retries} retries left)`)
        retries--
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
          continue
        }
      }

      break
    }

    if (procError) {
      console.error("[v0] Error generating interim tables:", procError)
      return NextResponse.json(
        { success: false, error: `Failed to generate interim tables: ${procError.message}` },
        { status: 500 },
      )
    }

    const generationTime = performance.now() - startTime
    console.log(`[v0] Interim tables generated in ${generationTime.toFixed(2)}ms`)
    console.log(`[v0] Result:`, JSON.stringify(procResult, null, 2))

    if (procResult && typeof procResult === "object" && procResult.error) {
      console.error("[v0] Generation failed:", procResult.error)
      return NextResponse.json(
        {
          success: false,
          error: typeof procResult.error === "object" ? procResult.error.message : procResult.error,
          details: procResult.error,
        },
        { status: 500 },
      )
    }

    if (!procResult || procResult.success === false) {
      console.error("[v0] Generation failed:", procResult?.error)
      return NextResponse.json(
        {
          success: false,
          error: procResult?.error || "Generation failed",
          validationWarnings: procResult?.validation_warnings,
          sourceDataCounts: procResult?.source_data_counts,
        },
        { status: 500 },
      )
    }

    const { count: statusCount } = await supabase
      .from("aca_employee_monthly_status")
      .select("*", { count: "exact", head: true })
      .eq("company_code", companyCode)
      .eq("tax_year", taxYear)

    console.log(`[v0] Verification: ${statusCount || 0} status records created`)

    return NextResponse.json({
      success: true,
      companyCode,
      taxYear,
      generationTimeMs: generationTime,
      recordsGenerated: procResult.total_rows_inserted || 0,
      recordsVerified: statusCount || 0,
      sourceDataCounts: procResult.source_data_counts,
      validationWarnings: procResult.validation_warnings,
      message: `Successfully generated interim tables for company ${companyCode}, tax year ${taxYear}`,
    })
  } catch (error: any) {
    const totalTime = performance.now() - startTime
    console.error(`[v0] Error in interim generation after ${totalTime.toFixed(2)}ms:`, error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate interim tables" },
      { status: 500 },
    )
  }
}
