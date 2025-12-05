"use client"

import { usePathname } from "next/navigation"

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/auth")

    if (isAuthPage) {
        return null
    }

    return <>{children}</>
}
