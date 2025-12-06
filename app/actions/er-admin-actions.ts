"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function getCompanyAdmins(companyCode: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("company_code", companyCode)
            .eq("role", "employer_admin")
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Error fetching ER admins:", error)
            return { error: error.message }
        }

        return { data }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function inviteEmployerAdmin(email: string, companyCode: string) {
    if (!email) return { error: "Email is required" }

    // Use Admin Client for invitations
    const supabaseAdmin = createAdminClient()

    try {
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password`

        // 1. Invite User
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
                role: "employer_admin",
                company_code: companyCode
            }
        })

        if (error) throw new Error(error.message)
        if (!data.user) throw new Error("Failed to create user")

        // 2. Upsert Profile
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: data.user.id,
                email: data.user.email,
                role: "employer_admin",
                company_code: companyCode,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: "id" })

        // 3. Create User Company Mapping (for robust access control)
        const { error: mappingError } = await supabaseAdmin
            .from("user_company_mapping")
            .upsert({
                user_id: data.user.id,
                company_code: companyCode,
                role: "employer_admin",
                is_primary: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: "user_id, company_code" })

        if (profileError || mappingError) {
            console.error("Profile/Mapping sync error:", profileError, mappingError)
            // User created but sync failed
            return { success: true, message: "User invited but permissions sync had issues. Please check logs." }
        }

        revalidatePath(`/admin/companies/${companyCode}/edit`)
        return { success: true, message: `Invitation sent to ${email}` }
    } catch (error: any) {
        console.error("Invite Error:", error)
        return { error: error.message || "Failed to invite user" }
    }
}

export async function toggleUserStatus(userId: string, newStatus: boolean, companyCode: string) {
    const supabaseAdmin = createAdminClient() // Use admin to ensure we can modify other users

    try {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_active: newStatus })
            .eq("id", userId)

        if (error) throw new Error(error.message)

        revalidatePath(`/admin/companies/${companyCode}/edit`)
        return { success: true, message: newStatus ? "User access enabled" : "User access disabled" }
    } catch (error: any) {
        return { error: error.message }
    }
}
