"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
    { name: "Manage Users", href: "/settings/users" },
    { name: "Manage Company", href: "/settings/company" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-600 mt-2">Manage your application configuration and preferences</p>
            </div>

            <div className="flex border-b border-slate-200">
                {tabs.map((tab) => {
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
                            {tab.name}
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
