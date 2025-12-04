import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyCode = searchParams.get("companyCode")

    let query = supabase
        .from("employee_census")
        .select("employee_id, first_name, last_name, email")
        .order("employee_id", { ascending: true })

    if (companyCode) {
        query = query.eq("company_code", companyCode)
    }

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
