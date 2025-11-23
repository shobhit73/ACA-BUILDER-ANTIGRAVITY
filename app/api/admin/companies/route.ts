import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const { companyName, email, password, modules } = await req.json()

        // Validate input
        if (!companyName || !email || !password) {
            return NextResponse.json(
                { error: "Company name, email, and password are required" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            )
        }

        // Create Supabase client with service role
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Check if tables exist (simple validation)
        const { error: tenantsCheck } = await supabase
            .from('tenants')
            .select('id')
            .limit(1)

        if (tenantsCheck) {
            console.error("Tenants table error:", tenantsCheck)
            return NextResponse.json(
                { error: "Database not ready. Please run migrations first." },
                { status: 500 }
            )
        }

        // 1. Create the tenant (company)
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                name: companyName,
                contact_email: email,
                status: 'active'
            })
            .select()
            .single()

        if (tenantError) {
            console.error("Error creating tenant:", tenantError)
            return NextResponse.json(
                { error: "Failed to create company: " + tenantError.message },
                { status: 500 }
            )
        }

        // 2. Create the admin user for this company
        const passwordHash = await hashPassword(password)

        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                email: email,
                password_hash: passwordHash,
                role: 'employer_admin',
                tenant_id: tenant.id,
                is_active: true
            })
            .select()
            .single()

        if (userError) {
            console.error("Error creating user:", userError)

            // Rollback: delete the tenant
            await supabase.from('tenants').delete().eq('id', tenant.id)

            return NextResponse.json(
                { error: "Failed to create user: " + userError.message },
                { status: 500 }
            )
        }

        // 3. Assign modules to the company
        if (modules) {
            const moduleRecords = []
            if (modules.aca) moduleRecords.push({ tenant_id: tenant.id, module_name: 'aca', is_enabled: true })
            if (modules.pdf) moduleRecords.push({ tenant_id: tenant.id, module_name: 'pdf', is_enabled: true })
            if (modules.penalty_dashboard) moduleRecords.push({ tenant_id: tenant.id, module_name: 'penalty_dashboard', is_enabled: true })

            if (moduleRecords.length > 0) {
                const { error: moduleError } = await supabase
                    .from('tenant_modules')
                    .insert(moduleRecords)

                if (moduleError) {
                    console.error("Error assigning modules:", moduleError)
                    // Don't fail the whole operation, just log it
                    console.warn("Modules assignment failed, but company was created")
                }
            }
        }

        console.log(`✅ Company "${companyName}" created successfully with ID: ${tenant.id}`)
        console.log(`✅ Modules assigned: ${Object.keys(modules || {}).filter(k => modules[k]).join(', ')}`)

        return NextResponse.json({
            success: true,
            company: {
                id: tenant.id,
                name: tenant.name,
                email: email,
                modules: modules
            }
        })
    } catch (error) {
        console.error("API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
