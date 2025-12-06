import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const { companyCode, taxYear } = await request.json()

        if (!companyCode || !taxYear) {
            return NextResponse.json({ success: false, error: "Company code and tax year are required" }, { status: 400 })
        }

        const supabase = await createClient()

        console.log(`[ACA Report] Starting generation process for ${companyCode} / ${taxYear}`)

        // 1. Generate Interim Tables (Automated Step)
        console.log(`[ACA Report] Step 1: Generating interim tables...`)
        // @ts-ignore
        const { data: interimData, error: interimError } = await supabase.rpc("generate_aca_monthly_interim", {
            p_company_code: companyCode,
            p_tax_year: taxYear,
        })

        if (interimError) {
            console.error("[ACA Report] Interim generation failed:", interimError)
            // We return error here because if interim fails, final report will definitely be empty/wrong
            return NextResponse.json({ success: false, error: `Interim Data Generation Failed: ${interimError.message}` }, { status: 500 })
        }
        console.log("[ACA Report] Interim generation success:", interimData)

        // 2. Generate Final Report (Codes)
        console.log(`[ACA Report] Step 2: Generating final report...`)
        // @ts-ignore
        const { data, error } = await supabase.rpc("generate_aca_final_report", {
            p_company_code: companyCode,
            p_tax_year: taxYear,
        })

        if (error) {
            console.error("[ACA Report] Generation error:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        console.log("[ACA Report] Generation result:", data)

        // Check for logical error in RPC response
        // @ts-ignore
        if (data && data.success === false) {
            console.error("[ACA Report] Logic Error:", data)
            // @ts-ignore
            return NextResponse.json({ success: false, error: data.error || "Unknown logic error" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data,
        })
    } catch (error: any) {
        console.error("[ACA Report] Unexpected error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
