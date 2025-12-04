import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const companyCode = searchParams.get("companyCode")
        const taxYear = searchParams.get("taxYear")
        const page = Number.parseInt(searchParams.get("page") || "1")
        const limit = Number.parseInt(searchParams.get("limit") || "50")
        const search = searchParams.get("search")

        if (!companyCode || !taxYear) {
            return NextResponse.json({ success: false, error: "Company code and tax year are required" }, { status: 400 })
        }

        const supabase = await createClient()
        const offset = (page - 1) * limit

        let query = supabase
            .from("aca_penalty_report")
            .select("*", { count: "exact" })
            .eq("company_code", companyCode)
            .eq("tax_year", taxYear)

        if (search) {
            query = query.or(`employee_id.ilike.%${search}%,reason.ilike.%${search}%`)
        }

        const { data, error, count } = await query
            .order("employee_id", { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error("[ACA Penalties] Fetch error:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        // Calculate totals for summary cards
        const { data: summaryData, error: summaryError } = await supabase
            .from("aca_penalty_report")
            .select("penalty_type, total_amount")
            .eq("company_code", companyCode)
            .eq("tax_year", taxYear)

        let totalPenaltyA = 0
        let totalPenaltyB = 0

        if (!summaryError && summaryData) {
            summaryData.forEach((row: any) => {
                if (row.penalty_type === 'A') totalPenaltyA += row.total_amount || 0
                if (row.penalty_type === 'B') totalPenaltyB += row.total_amount || 0
            })
        }

        return NextResponse.json({
            success: true,
            data,
            summary: {
                totalPenaltyA,
                totalPenaltyB,
                grandTotal: totalPenaltyA + totalPenaltyB
            },
            pagination: {
                page,
                limit,
                total: count,
                totalPages: count ? Math.ceil(count / limit) : 0,
            },
        })
    } catch (error: any) {
        console.error("[ACA Penalties] Unexpected error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { companyCode, taxYear } = body

        if (!companyCode || !taxYear) {
            return NextResponse.json({ success: false, error: "Company code and tax year are required" }, { status: 400 })
        }

        const supabase = await createClient()

        const { data, error } = await supabase.rpc("generate_aca_penalties", {
            p_company_code: companyCode,
            p_tax_year: taxYear,
        })

        if (error) {
            console.error("[ACA Penalties] Generation error:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error("[ACA Penalties] Unexpected error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
