import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const tableName = searchParams.get("table")
        const page = parseInt(searchParams.get("page") || "1")
        const pageSize = parseInt(searchParams.get("pageSize") || "50")

        if (!tableName) {
            return NextResponse.json({ success: false, error: "Table name is required" }, { status: 400 })
        }

        const supabase = await createClient()

        // Calculate offset
        const offset = (page - 1) * pageSize

        // Fetch data with pagination
        const { data, error, count } = await supabase
            .from(tableName)
            .select("*", { count: "exact" })
            .range(offset, offset + pageSize - 1)
            .order("created_at", { ascending: false })

        if (error) {
            console.error(`[v0] Error fetching data from ${tableName}:`, error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        })
    } catch (error) {
        console.error("[v0] Error in table data API:", error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}
