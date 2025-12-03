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

        // Fetch data with pagination
        let query = supabase
            .from("aca_final_report")
            .select(
                `
        *,
        employee_census!inner (
          first_name,
          last_name
        )
      `,
                { count: "exact" },
            )
            .eq("company_code", companyCode)
            .eq("tax_year", taxYear)

        if (search) {
            // Search by Employee ID, First Name, or Last Name
            query = query.or(`employee_id.ilike.%${search}%,employee_census.first_name.ilike.%${search}%,employee_census.last_name.ilike.%${search}%`)
        }

        const { data, error, count } = await query
            .order("employee_id", { ascending: true })
            .order("month", { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error("[ACA Report] Fetch error:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: count ? Math.ceil(count / limit) : 0,
            },
        })
    } catch (error: any) {
        console.error("[ACA Report] Unexpected error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
