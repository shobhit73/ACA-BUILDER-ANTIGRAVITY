import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
    try {
        const { companyCode, taxYear } = await request.json()

        if (!companyCode || !taxYear) {
            return NextResponse.json({ success: false, error: "Company code and tax year are required" }, { status: 400 })
        }

        const supabase = await createClient()

        console.log(`[ACA Report] Generating final report for ${companyCode} / ${taxYear}`)

        const { data, error } = await supabase.rpc("generate_aca_final_report", {
            p_company_code: companyCode,
            p_tax_year: taxYear,
        })

        if (error) {
            console.error("[ACA Report] Generation error:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        console.log("[ACA Report] Generation result:", data)

        return NextResponse.json({
            success: true,
            data,
        })
    } catch (error: any) {
        console.error("[ACA Report] Unexpected error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
