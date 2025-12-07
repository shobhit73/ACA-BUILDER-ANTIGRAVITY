"use client"

/**
 * Sidebar Component
 * 
 * The primary navigation component for the Dashboard.
 * 
 * Core Responsibilities:
 * 1. **User Role Handling**: 
 *    - Fetches the current user's role from `profiles` and `user_company_mapping`.
 *    - Differentiates between 'System Admin', 'Employer Admin', and 'Employee'.
 * 
 * 2. **Module-Based Filtering**:
 *    - For Company/Employer Admins, it fetches the `modules` array from `company_details`.
 *    - Filters the navigation items (e.g., "Import Data", "ACA Report") based on which modules are active for the assigned company.
 *    - If a user is mapped to multiple companies, it defaults to the primary one or handles switching context.
 * 
 * 3. **Dynamic Rendering**:
 *    - System Admins see all administrative tools ("Companies", "System Users").
 *    - Employer Admins see only company-specific tools authorized by their modules.
 */

import { useState, useEffect } from "react"
import NextImage from "next/image"
import logo from "@/app/assets/logo.png"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Upload, FileOutput, Settings, Database, Calculator, FileText, Sliders, AlertTriangle, LogOut, Building, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type ModuleCode =
  | "import_data"
  | "view_data"
  | "plan_configuration"
  | "generate_reports"
  | "aca_report"
  | "pdf_1095c"
  | "pdf_1094c"
  | "aca_penalties"
  | "aca_penalties"
  | "sys_admin_only"
  | "manage_users"

const navigation = [
  {
    name: "Import Data",
    href: "/import",
    icon: Upload,
    moduleCode: "import_data" as ModuleCode,
  },
  {
    name: "View Data",
    href: "/data-viewer",
    icon: Database,
    moduleCode: "view_data" as ModuleCode,
  },
  {
    name: "Generate Reports",
    href: "/reports",
    icon: FileOutput,
    moduleCode: "generate_reports" as ModuleCode,
  },
  {
    name: "ACA Report",
    href: "/aca-report",
    icon: Calculator,
    moduleCode: "aca_report" as ModuleCode,
  },
  {
    name: "1095-C PDFs",
    href: "/pdf-1095c",
    icon: FileText,
    moduleCode: "pdf_1095c" as ModuleCode,
  },
  {
    name: "1094-C Form",
    href: "/pdf-1094c",
    icon: FileText,
    moduleCode: "pdf_1094c" as ModuleCode,
  },
  {
    name: "Plan Configuration",
    href: "/plan-configuration",
    icon: Sliders,
    moduleCode: "plan_configuration" as ModuleCode,
  },
  {
    name: "ACA Penalties",
    href: "/aca-penalties",
    icon: AlertTriangle,
    moduleCode: "aca_penalties" as ModuleCode,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    moduleCode: null, // Always visible
  },
  // SYSTEM ADMIN ONLY ROUTES
  {
    name: "Companies",
    href: "/admin/companies",
    icon: Building,
    moduleCode: "sys_admin_only",
  },
  {
    name: "Manage Users",
    href: "/settings/users",
    icon: Users,
    moduleCode: "manage_users",
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ name: string; role: string; companyCode?: string } | null>(null)
  const [allowedModules, setAllowedModules] = useState<ModuleCode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUserAndPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const name = user.user_metadata.first_name || user.email?.split("@")[0] || "User"
          // MAPPING: Map DB role to UI role
          let role = "User"
          const metaRole = user.user_metadata.role

          if (metaRole === "super_admin" || metaRole === "system_admin") {
            role = "System Admin"
          } else if (metaRole === "employer_admin" || metaRole === "company_admin") {
            role = "Employer Admin"
          }

          let companyCode = null
          let modules: ModuleCode[] = []

          if (role === "System Admin") {
            // Super Admin has access to everything
            modules = navigation.map(n => n.moduleCode).filter((c): c is ModuleCode => c !== null)
            // Allow sys admin routes
            modules.push("sys_admin_only" as any)
          } else {
            // Fetch user's company and modules
            const { data: profile } = await supabase
              .from("profiles")
              .select("company_code")
              .eq("id", user.id)
              .single()

            if (profile && profile.company_code) {
              companyCode = profile.company_code

              // Fetch allowed modules from company_details
              // Core modules are always active: import_data, view_data, plan_configuration
              modules = ["import_data", "view_data", "plan_configuration"]

              const { data: companyDetails } = await supabase
                .from("company_details")
                .select("modules")
                .eq("company_code", companyCode)
                .single()

              if (companyDetails && companyDetails.modules && Array.isArray(companyDetails.modules)) {
                // Append add-on modules
                modules = [...modules, ...companyDetails.modules] as ModuleCode[]
              }
            }
          }

          setUser({ name, role, companyCode: companyCode || undefined })
          setAllowedModules(modules)
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error)
      } finally {
        setIsLoading(false)
      }
    }
    getUserAndPermissions()
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

  if (isLoading) {
    return <div className="w-64 bg-slate-900" /> // Loading state
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white shadow-xl">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6 bg-slate-900">
        <NextImage src={logo} alt="Compliance Suite Logo" className="h-8 w-8" />
        <div>
          <h1 className="font-bold text-lg leading-none text-white">Compliance Suite</h1>
          <p className="text-xs text-slate-400">1095-C Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {user && navigation
          .filter(item => {
            // Strict check for Settings: Only System Admin can see it (or Employer Admin? Keeping mostly sys admin for now)
            if (item.name === "Settings") {
              // return user.role === "System Admin" // Old logic
              return true // Let everyone see settings, page handles access
            }

            if (item.moduleCode === "sys_admin_only") {
              return user.role === "System Admin"
            }

            if (item.moduleCode === "manage_users") {
              return user.role === "System Admin" || user.role === "Employer Admin"
            }

            if (!item.moduleCode) return true // Always show other items without module code
            return allowedModules.includes(item.moduleCode)
          })
          .map((item) => {
            const isActive = pathname === item.href ||
              (item.moduleCode === 'view_data' && pathname.startsWith('/data-viewer')) ||
              (item.moduleCode === 'generate_reports' && (pathname === '/reports')) // data-viewer check handled in submenu for highlight

            if (item.moduleCode === 'view_data') {
              return (
                <ViewDataSubMenu key={item.name} item={item} isActive={isActive} />
              )
            }

            if (item.moduleCode === 'generate_reports') {
              return (
                <GenerateReportsSubMenu key={item.name} item={item} isActive={isActive} />
              )
            }

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
      <div className="border-t border-slate-800 p-4 bg-slate-900 space-y-4 shrink-0">
        {user && (
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{user.name}</span>
              <span className="text-xs text-slate-400">{user.role}</span>
              {user.companyCode && <span className="text-[10px] text-slate-500">{user.companyCode}</span>}
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

import { TABLES } from "@/lib/constants/tables"
import { ChevronDown, ChevronRight as ChevronRightIcon, LayoutDashboard, Table as TableIcon } from "lucide-react"

function ViewDataSubMenu({ item, isActive }: { item: any, isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const currentTable = searchParams.get('table')

  // Close accordion when navigating away or if not active
  useEffect(() => {
    if (!isActive) {
      setIsOpen(false)
    }
  }, [pathname, isActive])

  const groupedTables = TABLES.reduce((acc, table) => {
    if (!acc[table.group]) {
      acc[table.group] = []
    }
    acc[table.group].push(table)
    return acc
  }, {} as Record<string, typeof TABLES>)

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
          isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn("h-5 w-5")} />
          {item.name}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="pl-4 space-y-4 py-2">
          {Object.entries(groupedTables).map(([group, tables]) => (
            <div key={group} className="space-y-1">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 px-2 mb-1">{group}</h4>
              {tables.map(table => (
                <Link
                  key={table.name}
                  href={`/data-viewer?table=${table.name}`}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-xs transition-colors",
                    currentTable === table.name
                      ? "bg-slate-800 text-blue-400 font-medium"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  )}
                >
                  {table.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GenerateReportsSubMenu({ item, isActive }: { item: any, isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const currentTable = searchParams.get('table')

  const reportTables = [
    { label: "Monthly Status", name: "aca_employee_monthly_status" },
    { label: "Monthly Offer", name: "aca_employee_monthly_offer" },
    { label: "Monthly Enrollment", name: "aca_employee_monthly_enrollment" },
  ]

  // Check if we are viewing one of the report tables
  const isViewingReportTable = reportTables.some(t => t.name === currentTable)

  // Close accordion when navigating away or if not active
  useEffect(() => {
    if (!isActive && !isViewingReportTable) {
      setIsOpen(false)
    }
  }, [pathname, isActive, isViewingReportTable])

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
          (isActive || isViewingReportTable)
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn("h-5 w-5")} />
          {item.name}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="pl-4 space-y-1 py-1">
          <Link
            href="/reports"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
              pathname === '/reports'
                ? "bg-slate-800 text-blue-400 font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <LayoutDashboard className="h-3 w-3" />
            Generate New
          </Link>

          <div className="pt-2 pb-1 text-[10px] uppercase font-bold text-slate-500 px-2">View Reports</div>

          {reportTables.map(table => (
            <Link
              key={table.name}
              href={`/data-viewer?table=${table.name}`}
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs transition-colors",
                currentTable === table.name
                  ? "bg-slate-800 text-blue-400 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              {table.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
