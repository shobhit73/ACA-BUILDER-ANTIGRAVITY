"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, LogOut, Shield, Building, AlertCircle } from "lucide-react"
import { ReactNode, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdminLayoutProps {
    children: ReactNode
    username?: string // Fallback if fetch fails
}

interface User {
    id: string
    email: string
    role: string
    name: string
    tenant_name?: string
}

export default function AdminLayout({ children, username: initialUsername = "User" }: AdminLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 1. Fetch User Profile
    // We fetch the user's role and tenant info to determine what they can see
    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch("/api/auth/me")
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user)
                } else {
                    // Capture and display API errors (e.g., 500, 401) directly in the UI
                    const json = await res.json().catch(() => ({}))
                    setError(`Error: ${res.status} ${json.error || res.statusText}`)
                }
            } catch (error) {
                console.error("Failed to fetch user:", error)
                setError(error instanceof Error ? error.message : "Fetch failed")
            } finally {
                setLoading(false)
            }
        }
        fetchUser()
    }, [])

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
            router.push("/login")
        } catch (error) {
            console.error("Logout error:", error)
            router.push("/login")
        }
    }

    // 2. Define Menu Items with Role Permissions
    const menuItems = [
        // Dashboard is accessible to everyone
        { icon: Home, label: "Dashboard", href: "/home", roles: ["admin", "employer_admin", "employer_user"] },
        // "Manage Clients" is STRICTLY for Super Admins
        { icon: Users, label: "Manage Clients", href: "/admin/clients", roles: ["admin"] },
    ]

    // 3. Filter Menu Based on Role
    // If loading, show nothing to prevent flickering. If loaded, filter strictly.
    const filteredMenu = loading
        ? []
        : menuItems.filter(item => user && item.roles.includes(user.role))

    const displayUsername = user?.name || initialUsername
    // Display tenant name if available, otherwise role
    const displaySubtitle = user?.tenant_name || (user?.role === 'admin' ? 'Super Admin' : 'Company Admin')

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-primary to-primary/90 text-white shadow-xl flex flex-col">
                <div className="p-6 flex-1">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">ACA Builder</h1>
                            <p className="text-xs text-white/70">Admin Portal</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-white">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            {error}
                        </div>
                    )}

                    <nav className="space-y-2">
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-10 bg-white/10 rounded"></div>
                                <div className="h-10 bg-white/10 rounded"></div>
                            </div>
                        ) : (
                            filteredMenu.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                            ? "bg-white/20 text-white font-medium"
                                            : "text-white/80 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </button>
                                )
                            })
                        )}
                    </nav>
                </div>

                {/* User info at bottom */}
                <div className="p-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                    {displayUsername.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium truncate w-24" title={displayUsername}>
                                    {displayUsername}
                                </p>
                                <p className="text-xs text-white/60 truncate w-24" title={displaySubtitle}>
                                    {displaySubtitle}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10 h-8 w-8 p-0"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
