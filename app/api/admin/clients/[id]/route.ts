import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const { companyName, modules } = await req.json()

        if (!id) {
            return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
        }

        // Create Supabase client with service role
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Update tenant name
        if (companyName) {
            const { error: updateError } = await supabase
                .from('tenants')
                .update({ name: companyName })
                .eq('id', id)

            if (updateError) {
                console.error("Error updating tenant:", updateError)
                return NextResponse.json({ error: "Failed to update company name" }, { status: 500 })
            }
        }

        // 2. Update modules
        if (modules) {
            // First, delete existing modules for this tenant
            const { error: deleteError } = await supabase
                .from('tenant_modules')
                .delete()
                .eq('tenant_id', id)

            if (deleteError) {
                console.error("Error deleting old modules:", deleteError)
                return NextResponse.json({ error: "Failed to update modules" }, { status: 500 })
            }

            // Prepare new module records
            const moduleRecords = []
            if (modules.aca) moduleRecords.push({ tenant_id: id, module_name: 'aca', is_enabled: true })
            if (modules.pdf) moduleRecords.push({ tenant_id: id, module_name: 'pdf', is_enabled: true })
            if (modules.penalty_dashboard) moduleRecords.push({ tenant_id: id, module_name: 'penalty_dashboard', is_enabled: true })

            if (moduleRecords.length > 0) {
                const { error: insertError } = await supabase
                    .from('tenant_modules')
                    .insert(moduleRecords)

                if (insertError) {
                    console.error("Error inserting new modules:", insertError)
                    return NextResponse.json({ error: "Failed to save new modules" }, { status: 500 })
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
