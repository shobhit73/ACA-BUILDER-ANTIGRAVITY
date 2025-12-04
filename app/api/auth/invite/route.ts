import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }

        const supabase = createAdminClient()

        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password`
        console.log("Invite Redirect URL:", redirectTo)

        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
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
