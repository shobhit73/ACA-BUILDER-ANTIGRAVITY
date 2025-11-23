import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        // 1. Extract the auth token from cookies
        // Note: Using req.cookies is safer than cookies() from next/headers in Route Handlers
        const token = req.cookies.get("auth-token")?.value

        console.log("[Auth/Me] Token:", token ? "Found" : "Missing")

        if (!token) {
            return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 })
        }

        // 2. Verify the JWT token
        const payload = await verifyToken(token)
        console.log("[Auth/Me] Payload:", payload)

        if (!payload) {
            return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 })
        }

        // 3. Check for required environment variables
        // This prevents cryptic 500 errors if the server is misconfigured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("[Auth/Me] Missing Env Vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json({ error: "Server Configuration Error: Missing Supabase keys" }, { status: 500 })
        }

        // 4. Initialize Supabase Admin Client
        // We use the Service Role Key here to bypass RLS, ensuring we can fetch the user's details
        // regardless of their current context or RLS policies.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // 5. Fetch User Details
        // We join with the 'tenants' table to get the company name directly
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id, 
                email, 
                role, 
                tenant_id,
                tenants (
                    name
                )
            `)
            .eq('id', payload.user_id)
            .single()

        console.log("[Auth/Me] DB User:", user)

        if (error) {
            console.error("[Auth/Me] Supabase Query Error:", error)
            return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 })
        }

        if (!user) {
            console.warn("[Auth/Me] User found in token but not in DB. ID:", payload.user_id)
            return NextResponse.json({ error: "User profile not found" }, { status: 404 })
        }

        // 6. Construct Response
        // We format the response to include a display-friendly name and tenant name
        const responseData = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenant_id: user.tenant_id,
                name: user.email.split('@')[0], // Derive display name from email
                tenant_name: user.tenants?.name || "System" // Fallback for super admins
            }
        }
        console.log("[Auth/Me] Sending Response:", responseData)

        return NextResponse.json(responseData)

    } catch (error: any) {
        // Catch-all for unexpected errors (e.g., network issues, code bugs)
        console.error("[Auth/Me] Unexpected Error:", error)
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 })
    }
}
