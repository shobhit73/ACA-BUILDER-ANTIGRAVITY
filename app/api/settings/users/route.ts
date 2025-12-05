import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyCode = searchParams.get("companyCode")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const search = searchParams.get("search") || ""

    let query = supabase
        .from("employee_census")
        .select("employee_id, first_name, last_name, email", { count: "exact" })
        .order("employee_id", { ascending: true })

    if (companyCode) {
        query = query.eq("company_code", companyCode)
    }

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    const { data, error, count } = await query.range(start, end)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
        data,
        pagination: {
            page,
            pageSize,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize)
        }
    })
}
