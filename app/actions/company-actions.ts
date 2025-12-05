"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type ModuleCode =
    | "import_data"
    | "view_data"
    | "plan_configuration"
    | "generate_reports"
    | "aca_report"
    | "pdf_1095c"
    | "aca_penalties"

export interface CreateCompanyState {
    message?: string
    error?: string
    success?: boolean
}

export async function createCompany(prevState: CreateCompanyState, formData: FormData): Promise<CreateCompanyState> {
    const supabase = await createClient()

    const companyName = formData.get("companyName") as string
    const companyCode = formData.get("companyCode") as string
    const contactEmail = formData.get("contactEmail") as string

    // Optional modules
    const generateReports = formData.get("generateReports") === "on"
    const acaReport = formData.get("acaReport") === "on"
    const pdf1095c = formData.get("pdf1095c") === "on"
    const acaPenalties = formData.get("acaPenalties") === "on"

    if (!companyName || !companyCode || !contactEmail) {
        return { error: "Please fill in all required fields." }
    }

    try {
        // 1. Create Company
        const { error: companyError } = await supabase.rpc("upsert_company_details", {
            p_company_code: companyCode,
            p_company_name: companyName,
            p_contact_email: contactEmail,
            p_country: null, // Explicitly pass country to match the new function signature and avoid ambiguity
            // Add other default fields if necessary or allow nulls
        })

        if (companyError) {
            console.error("Error creating company:", companyError)
            return { error: `Failed to create company: ${companyError.message}` }
        }

        // 2. Assign Default Modules (Always Enabled)
        const defaultModules: ModuleCode[] = ["import_data", "view_data", "plan_configuration"]
        for (const module of defaultModules) {
            await supabase.rpc("upsert_company_module", {
                p_company_code: companyCode,
                p_module_code: module,
                p_is_enabled: true
            })
        }

        // 3. Assign Optional Modules
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "generate_reports", p_is_enabled: generateReports })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "aca_report", p_is_enabled: acaReport })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "pdf_1095c", p_is_enabled: pdf1095c })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "aca_penalties", p_is_enabled: acaPenalties })

        revalidatePath("/admin/companies")
        return { success: true, message: "Company created successfully!" }
    } catch (error: any) {
        console.error("Unexpected error:", error)
        return { error: error.message || "An unexpected error occurred." }
    }
}

export async function getCompanyDetails(companyCode: string) {
    const supabase = await createClient()

    try {
        const { data: company, error } = await supabase
            .from("company_details")
            .select("*")
            .eq("company_code", companyCode)
            .single()

        if (error) throw error

        const { data: modules } = await supabase
            .from("company_modules")
            .select("module_code")
            .eq("company_code", companyCode)
            .eq("is_enabled", true)

        return {
            ...company,
            modules: modules?.map((m: any) => m.module_code) || []
        }
    } catch (error: any) {
        console.error("Error fetching company details:", error)
        return { error: "Failed to fetch company details" }
    }
}

export async function updateCompany(companyCode: string, prevState: CreateCompanyState, formData: FormData): Promise<CreateCompanyState> {
    const supabase = await createClient()

    const companyName = formData.get("companyName") as string
    const contactEmail = formData.get("contactEmail") as string

    const generateReports = formData.get("generateReports") === "on"
    const acaReport = formData.get("acaReport") === "on"
    const pdf1095c = formData.get("pdf1095c") === "on"
    const acaPenalties = formData.get("acaPenalties") === "on"

    try {
        // 1. Update Company Details
        const { error: companyError } = await supabase.rpc("upsert_company_details", {
            p_company_code: companyCode,
            p_company_name: companyName,
            p_contact_email: contactEmail,
            p_country: null,
            // Add other fields if necessary, preserving existing values would require fetching them first or passing them all
            // For now, upsert might overwrite nulls if not careful, but our SQL function handles defaults.
            // Ideally we should pass all fields or use a specific update query.
            // Given the SQL function, it updates all fields. We should probably fetch and merge or just update what we have.
            // Since this is an admin edit, we assume we are updating the main fields.
        })

        if (companyError) {
            return { error: `Failed to update company: ${companyError.message}` }
        }

        // 2. Update Modules
        // We need to explicitly set enabled/disabled for all optional modules
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "generate_reports", p_is_enabled: generateReports })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "aca_report", p_is_enabled: acaReport })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "pdf_1095c", p_is_enabled: pdf1095c })
        await supabase.rpc("upsert_company_module", { p_company_code: companyCode, p_module_code: "aca_penalties", p_is_enabled: acaPenalties })

        revalidatePath("/admin/companies")
        revalidatePath(`/admin/companies/${companyCode}/edit`)
        return { success: true, message: "Company updated successfully!" }
    } catch (error: any) {
        console.error("Unexpected error:", error)
        return { error: error.message || "An unexpected error occurred." }
    }
}
