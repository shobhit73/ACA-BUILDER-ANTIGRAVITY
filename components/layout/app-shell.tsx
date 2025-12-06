"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/sidebar"
import { TopHeader } from "@/components/layout/top-header"
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<{ role: string; email: string; name: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/auth")

    useEffect(() => {
        if (isAuthPage) {
            setIsLoading(false)
            return
        }

        const fetchUser = async () => {
            const supabase = createClient()
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    let role = "User"
                    const metaRole = user.user_metadata.role

                    if (metaRole === "super_admin" || metaRole === "system_admin") {
                        role = "System Admin"
                    } else if (metaRole === "employer_admin" || metaRole === "company_admin") {
                        role = "Employer Admin"
                    }

                    const name = user.user_metadata.first_name || user.email?.split("@")[0] || "User"
                    setUser({ role, email: user.email || "", name })
                } else {
                    // Redirect to login if getting user fails in a protected route
                    // Although middleware handles this, client-side check is good too
                    // router.push("/login")
                }
            } catch (error) {
                console.error("Error fetching user in AppShell:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUser()
    }, [isAuthPage, router])

    if (isAuthPage) {
        return <>{children}</>
    }

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // Employee Layout (Top Header)
    if (user && user.role === "User") {
        return (
            <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
                <TopHeader user={user} />
                <main className="flex-1 overflow-y-auto">
                    <div className="container mx-auto p-8 max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        )
    }

    // System Admin Layout (Sidebar) - Default fallback
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white">
            {/* We render sidebar manually here instead of SidebarWrapper/Sidebar combo to have full control */}
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <div className="container mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
