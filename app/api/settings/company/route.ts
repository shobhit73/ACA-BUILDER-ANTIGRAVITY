import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const search = searchParams.get("search") || ""

    const supabase = await createClient()

    let query = supabase
        .from("company_details")
        .select("company_code, company_name, is_active", { count: "exact" })
        .order("company_code", { ascending: true })

    if (search) {
        query = query.or(`company_name.ilike.%${search}%,company_code.ilike.%${search}%`)
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
