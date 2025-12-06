"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleCompanyStatus(companyCode: string, newStatus: boolean) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from("company_details")
            .update({ is_active: newStatus })
            .eq("company_code", companyCode)

        if (error) {
            console.error("Error toggling company status:", error)
            return { error: error.message }
        }

        revalidatePath("/settings/company")
        return { success: true }
    } catch (error: any) {
        return { error: error.message || "Failed to update company status" }
    }
}

export async function getCompanyDetails(companyCode: string) {
    const supabase = await createClient()

    try {
        const { data: company, error: companyError } = await supabase
            .from("company_details")
            .select("*")
            .eq("company_code", companyCode)
            .single()

        if (companyError) throw new Error(companyError.message)

        const { data: modules, error: modulesError } = await supabase
            .from("company_module")
            .select("module_code, is_enabled")
            .eq("company_code", companyCode)

        if (modulesError) throw new Error(modulesError.message)

        const activeModules = modules?.filter(m => m.is_enabled).map(m => m.module_code) || []

        return {
            ...company,
            modules: activeModules
        }
    } catch (error: any) {
        console.error("Error fetching company details:", error)
        return { error: error.message }
    }
}

/**
 * Updates company details or module configuration based on the form submission type.
 * Handles split forms (Details vs Modules) to prevent data loss.
 *
 * @param companyCode - The unique identifier for the company
 * @param prevState - Previous form state (for useFormState)
 * @param formData - Form data containing invalid keys or 'formType' discriminator
 */
export async function updateCompany(companyCode: string, prevState: any, formData: FormData) {
    const supabase = await createClient()

    try {
        // Get Current User for Audit Trail
        const { data: { user } } = await supabase.auth.getUser()

        const formType = formData.get("formType") as string // "details" or "modules"

        if (formType === "details") {
            const rawData = {
                company_name: formData.get("companyName") as string,
                contact_email: formData.get("contactEmail") as string,
                ein: formData.get("ein") as string,
                contact_phone: formData.get("contactPhone") as string,
                contact_name: formData.get("contactName") as string,
                address_line_1: formData.get("addressLine1") as string,
                city: formData.get("city") as string,
                state: formData.get("state") as string,
                zip_code: formData.get("zipCode") as string,

                is_authoritative_transmittal: formData.get("isAuthoritative") === "on",
                is_agg_ale_group: formData.get("isAggregatedGroup") === "on",
                cert_qualifying_offer: formData.get("certQualifyingOffer") === "on",
                cert_98_percent_offer: formData.get("cert98PercentOffer") === "on",

                // Audit Trail
                modified_by: user?.id || null,
                modified_on: new Date().toISOString()
            }

            // Validate required fields
            if (!rawData.company_name) return { error: "Company Name is required" }
            if (!rawData.contact_email) return { error: "Contact Email is required" }

            const { error } = await supabase
                .from("company_details")
                .update(rawData)
                .eq("company_code", companyCode)

            if (error) throw new Error(error.message)

        } else if (formType === "modules") {
            const moduleMapping: Record<string, string> = {
                "generateReports": "generate_reports",
                "acaReport": "aca_report",
                "pdf1095c": "pdf_1095c",
                "pdf1094c": "pdf_1094c",
                "acaPenalties": "aca_penalties"
            }

            // Core modules are always active
            const activeModules: string[] = ["import_data", "view_data", "plan_configuration"]

            for (const [formId, moduleCode] of Object.entries(moduleMapping)) {
                const isEnabled = formData.get(formId) === "on"
                if (isEnabled) {
                    activeModules.push(moduleCode)
                }

                // Sync legacy/relational table
                const { error: moduleError } = await supabase
                    .from("company_module")
                    .upsert({
                        company_code: companyCode,
                        module_code: moduleCode,
                        is_enabled: isEnabled,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "company_code, module_code" })

                if (moduleError) console.error(`Error updating module ${moduleCode}:`, moduleError)
            }

            // Update Company Details (modules array only)
            const { error: updateError } = await supabase
                .from("company_details")
                .update({
                    modules: activeModules, // <<< Sync the array column
                    modified_by: user?.id || null,
                    modified_on: new Date().toISOString()
                })
                .eq("company_code", companyCode)

            if (updateError) throw new Error(updateError.message)
        } else {
            // Fallback: If no formType (shouldn't happen with new frontend), try to guess or return error
            // Assuming safer to error or do nothing than partial wipe
            return { error: "Invalid form submission type." }
        }

        revalidatePath(`/admin/companies/${companyCode}/edit`)
        revalidatePath("/settings/company")

        return { success: true, message: "Company updated successfully" }
    } catch (error: any) {
        console.error("Error updating company:", error)
        return { error: error.message || "Failed to update company" }
    }
}

/**
 * Creates a new company and initializes its default module configuration.
 * By default, Core modules (Import, View, Plan) are enabled.
 *
 * @param prevState - Previous form state
 * @param formData - Form data containing new company info
 */
export async function createCompany(prevState: any, formData: FormData) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()

        const companyCode = formData.get("companyCode") as string
        const companyName = formData.get("companyName") as string
        const contactEmail = formData.get("contactEmail") as string

        if (!companyCode || !companyName) {
            return { error: "Company Code and Name are required" }
        }

        const moduleMapping: Record<string, string> = {
            "generateReports": "generate_reports",
            "acaReport": "aca_report",
            "pdf1095c": "pdf_1095c",
            "pdf1094c": "pdf_1094c",
            "acaPenalties": "aca_penalties"
        }

        // Core modules are always active
        const activeModules: string[] = ["import_data", "view_data", "plan_configuration"]

        // Prepare relational inserts
        const moduleInserts = []

        for (const [formId, moduleCode] of Object.entries(moduleMapping)) {
            const isEnabled = formData.get(formId) === "on"
            if (isEnabled) {
                activeModules.push(moduleCode)
                moduleInserts.push({
                    company_code: companyCode,
                    module_code: moduleCode,
                    is_enabled: true
                })
            }
        }

        const { error: insertError } = await supabase
            .from("company_details")
            .insert({
                company_code: companyCode,
                company_name: companyName,
                contact_email: contactEmail,
                updated_at: new Date().toISOString(),
                is_active: true,
                add_name: user?.id,
                add_date: new Date().toISOString(),
                modules: activeModules // <<< Sync array column
            })

        if (insertError) {
            if (insertError.code === '23505') {
                return { error: "Company with this code already exists" }
            }
            throw new Error(insertError.message)
        }

        // Insert relational modules if any
        if (moduleInserts.length > 0) {
            await supabase.from("company_module").insert(moduleInserts)
        }

        revalidatePath("/settings/company")
        return { success: true, message: "Company created successfully" }

    } catch (error: any) {
        console.error("Error creating company:", error)
        return { error: error.message || "Failed to create company" }
    }
}
