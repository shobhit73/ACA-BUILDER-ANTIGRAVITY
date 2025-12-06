"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const allTabs = [
    { name: "Manage Users", href: "/settings/users", roles: ["System Admin", "User"] },
    { name: "Manage Company", href: "/settings/company", roles: ["System Admin"] },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                let role = "User"
                if (user.user_metadata.role === "super_admin" || user.user_metadata.role === "system_admin") {
                    role = "System Admin"
                } else if (user.user_metadata.role === "company_admin" || user.user_metadata.role === "employer_admin") {
                    role = "Employer Admin"
                }
                setUserRole(role)
            }
            setIsLoading(false)
        }
        fetchRole()
    }, [])

    if (isLoading) return null

    const visibleTabs = allTabs.filter(tab => {
        if (tab.name === "Manage Users") return ["System Admin", "Employer Admin", "User"].includes(userRole || "User")
        if (tab.name === "Manage Company") return ["System Admin"].includes(userRole || "User")
        return tab.roles.includes(userRole || "User")
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-600 mt-2">Manage your application configuration and preferences</p>
            </div>

            <div className="flex border-b border-slate-200">
                {visibleTabs.map((tab) => {
                    const isActive = pathname === tab.href
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                                isActive
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                            )}
                        >
                            {tab.name === "Manage Users" && userRole === "User" ? "My Profile" : tab.name}
                        </Link>
                    )
                })}
            </div>

            <div className="py-4">
                {children}
            </div>
        </div>
    )
}
