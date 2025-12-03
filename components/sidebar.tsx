"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Upload, FileOutput, Settings, Database, Calculator, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Import Data",
    href: "/import",
    icon: Upload,
  },
  {
    name: "View Data",
    href: "/data-viewer",
    icon: Database,
  },
  {
    name: "Generate Reports",
    href: "/reports",
    icon: FileOutput,
  },
  {
    name: "ACA Report",
    href: "/aca-report",
    icon: Calculator,
  },
  {
    name: "1095-C PDFs",
    href: "/pdf-1095c",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 via-cyan-900 to-teal-900 text-white shadow-2xl">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 border-b border-cyan-700/50 px-6 bg-gradient-to-r from-cyan-800/30 to-teal-800/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400 shadow-lg animate-pulse-glow">
          <span className="font-mono text-base font-bold text-slate-900">AC</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-white">ACA Builder</h1>
          <p className="text-xs text-cyan-200">1095-C Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out",
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg scale-105"
                  : "text-cyan-100 hover:bg-cyan-800/50 hover:text-white hover:scale-105 hover:translate-x-1",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "animate-float")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-cyan-700/50 p-4 bg-gradient-to-r from-cyan-900/30 to-teal-900/30">
        <div className="text-xs text-cyan-300">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 ACA Builder</p>
        </div>
      </div>
    </div>
  )
}
