"use client"

import { useState, useEffect } from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Upload, FileOutput, Settings, Database, Calculator, FileText, Sliders, AlertTriangle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const navigation = [

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
    name: "Plan Configuration",
    href: "/plan-configuration",
    icon: Sliders,
  },
  {
    name: "ACA Penalties",
    href: "/aca-penalties",
    icon: AlertTriangle,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata.first_name || user.email?.split("@")[0] || "User"
        const role = user.user_metadata.role === "super_admin" ? "System Admin" : "User"
        setUser({ name, role })
      }
    }
    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Error logging out")
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white shadow-xl">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6 bg-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
          <span className="font-mono text-base font-bold text-white">AC</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-white">ACA Builder</h1>
          <p className="text-xs text-slate-400">1095-C Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {user && navigation
          .filter(item => {
            if (user.role === "System Admin") return true
            if (user.role === "User") return item.name === "1095-C PDFs"
            return false
          })
          .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className={cn("h-5 w-5")} />
                {item.name}
              </Link>
            )
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4 bg-slate-900 space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{user.name}</span>
              <span className="text-xs text-slate-400">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
        <div className="text-xs text-slate-500">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 ACA Builder</p>
        </div>
      </div>
    </div>
  )
}
