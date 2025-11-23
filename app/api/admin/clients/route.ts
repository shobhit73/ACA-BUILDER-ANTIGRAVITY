import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
    try {
        // Security Check: Only allow super admins
        const userRole = req.headers.get("x-user-role")
        if (userRole !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized. Only super admins can access this resource." },
                { status: 403 }
            )
        }

        // Create Supabase client with service role
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch all tenants with their admin users and modules
        const { data: tenants, error: tenantsError } = await supabase
            .from('tenants')
            .select(`
        *,
        users!users_tenant_id_fkey(email, role),
        tenant_modules(module_name, is_enabled)
      `)
            .order('created_at', { ascending: false })

        if (tenantsError) {
            console.error("Error fetching tenants:", tenantsError)
            return NextResponse.json(
                { error: "Failed to fetch companies" },
                { status: 500 }
            )
        }

        // Format the response
        const companies = tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            contact_email: tenant.contact_email,
            created_at: tenant.created_at,
            status: tenant.status,
            admin_email: tenant.users?.find((u: any) => u.role === 'employer_admin')?.email,
            modules: tenant.tenant_modules || []
        }))

        return NextResponse.json({
            success: true,
            companies
        })
    } catch (error) {
        console.error("API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
