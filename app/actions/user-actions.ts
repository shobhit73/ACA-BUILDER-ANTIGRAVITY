"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || (!user.email && !user.user_metadata.email)) {
        return { error: "Not authenticated" }
    }

    const email = user.email || user.user_metadata.email

    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Validate Password if provided
    if (password) {
        if (password.length < 6) {
            return { error: "Password must be at least 6 characters long" }
        }
        if (password !== confirmPassword) {
            return { error: "Passwords do not match" }
        }
    }

    try {
        // 1. Update Profile in employee_census
        // We match by email since employee_census might not have the UUID yet linked in a standard way 
        // or we rely on email as the link.
        const { error: profileError } = await supabase
            .from("employee_census")
            .update({
                first_name: firstName,
                last_name: lastName
            })
            .eq("email", email)

        if (profileError) {
            console.error("Error updating profile:", profileError)
            return { error: "Failed to update profile details" }
        }

        // 2. Update Password if provided
        if (password) {
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            })
            if (authError) {
                console.error("Error updating password:", authError)
                return { error: `Failed to update password: ${authError.message}` }
            }
        }

        revalidatePath("/settings/users")
        return { success: true, message: "Profile updated successfully" }
    } catch (error: any) {
        return { error: error.message || "An unexpected error occurred" }
    }
}
