import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("company_details")
        .select("company_code, company_name")
        .order("company_code", { ascending: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
