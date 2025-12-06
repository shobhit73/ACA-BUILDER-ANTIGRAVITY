import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { email, role = "employee" } = await request.json()

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }

        const supabase = createAdminClient()

        const nextUrl = encodeURIComponent(`/auth/set-password?role=${role}`)
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${nextUrl}`
        console.log("Invite Redirect URL:", redirectTo, "Role:", role)

        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: { role } // Store role in metadata
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (data && data.user) {
            // Profile creation is handled by 'on_auth_user_created' db trigger
            // using the metadata passed above.
            console.log("Invite success, profile should be created by trigger.")
        }

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error("Invite API Error:", error)
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            env_check: {
                has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
            }
        }, { status: 500 })
    }
}
