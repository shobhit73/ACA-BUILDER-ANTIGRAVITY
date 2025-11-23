"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, LogOut, Shield, Building } from "lucide-react"
import { ReactNode } from "react"

interface AdminLayoutProps {
    children: ReactNode
    username?: string
}

export default function AdminLayout({ children, username = "naveen" }: AdminLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
            router.push("/login")
        } catch (error) {
            console.error("Logout error:", error)
            router.push("/login")
        }
    }

    const menuItems = [
        { icon: Home, label: "Dashboard", href: "/home" },
        { icon: Users, label: "Manage Clients", href: "/admin/clients" },
    ]

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-primary to-primary/90 text-white shadow-xl">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">ACA Builder</h1>
                            <p className="text-xs text-white/70">Admin Portal</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {menuItems.map((item) => {
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
                        })}
                    </nav>
                </div>

                {/* User info at bottom */}
                <div className="absolute bottom-0 w-64 p-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                    {username.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{username}</p>
                                <p className="text-xs text-white/60">Super Admin</p>
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
