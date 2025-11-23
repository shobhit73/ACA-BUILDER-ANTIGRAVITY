"use client"

import { useRouter, usePathname } from "next/navigation"
import { LogOut, Shield, Building } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Navigation() {
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

    // Don't show nav on login page
    if (pathname === "/login") {
        return null
    }

    return (
        <nav className="bg-gradient-to-r from-accent to-primary text-white shadow-lg">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo/Brand */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">ACA Builder</h1>
                            <p className="text-xs text-white/80">Compliance Suite</p>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="flex items-center gap-4">
                        {/* Add Company Button (Super Admin only) */}
                        <Button
                            onClick={() => router.push('/admin/companies')}
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            size="sm"
                        >
                            <Building className="h-4 w-4 mr-2" />
                            Add Company
                        </Button>

                        {/* Logout Button */}
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            size="sm"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
