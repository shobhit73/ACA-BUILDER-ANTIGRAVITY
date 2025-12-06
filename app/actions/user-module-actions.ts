"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function getUserModules() {
    // 1. Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // 2. Check Role
    const metaRole = user.user_metadata.role
    let role = "User"
    if (metaRole === "super_admin" || metaRole === "system_admin") {
        role = "System Admin"
    } else if (metaRole === "employer_admin" || metaRole === "company_admin") {
        role = "Employer Admin"
    }

    if (role === "System Admin") {
        return ["all"] // Handle in UI
    }

    if (role === "User") {
        return []
    }

    // 3. Employer Admin: Fetch Details using ADMIN client (Bypass RLS)
    const adminClient = createAdminClient()

    // Get Company Code
    let companyCode = user.user_metadata.company_code

    if (!companyCode) {
        // Fallback to profile
        const { data: profile } = await adminClient
            .from("profiles")
            .select("company_code")
            .eq("id", user.id)
            .single()
        companyCode = profile?.company_code
    }

    if (!companyCode) return []

    // Get Company Modules
    const { data: companyDetails } = await adminClient
        .from("company_details")
        .select("modules")
        .eq("company_code", companyCode)
        .single()

    // Core modules always active for Employer Admin
    const coreModules = ["import_data", "view_data", "plan_configuration"]

    let dbModules = []
    if (companyDetails && companyDetails.modules && Array.isArray(companyDetails.modules)) {
        dbModules = companyDetails.modules
    }

    // Combine unique
    return Array.from(new Set([...coreModules, ...dbModules]))
}
