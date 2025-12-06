import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse, NextRequest } from "next/server"

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Create admin client for bypassing RLS on profiles table
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
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

    const { data: censusData, error, count } = await query.range(start, end)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch profile status
    // Normalize emails to lowercase for querying to ensure case-insensitive matching
    const emails = censusData?.map((u: any) => u.email?.toLowerCase()).filter(Boolean) || []

    let profileMap: Record<string, { ee_active: boolean, er_active: boolean }> = {}

    if (emails.length > 0) {
        // Use admin client to bypass RLS policies that might hide other users' profiles
        const { data: profiles } = await adminSupabase
            .from("profiles")
            .select("email, role")
            .in("email", emails)

        profiles?.forEach((profile: any) => {
            if (profile.email) {
                // Store using lowercase key
                profileMap[profile.email.toLowerCase()] = {
                    ee_active: true, // If they have a profile, they are a registered user (EE link)
                    er_active: ["system_admin", "super_admin"].includes(profile.role || "") // Check for admin role
                }
            }
        })
    }

    const enrichedData = censusData?.map((user: any) => ({
        ...user,
        ee_active: user.email ? (profileMap[user.email.toLowerCase()]?.ee_active || false) : false,
        er_active: user.email ? (profileMap[user.email.toLowerCase()]?.er_active || false) : false
    }))

    return NextResponse.json({
        data: enrichedData,
        pagination: {
            page,
            pageSize,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize)
        }
    })
}
