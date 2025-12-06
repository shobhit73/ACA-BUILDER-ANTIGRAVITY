"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Database,
  Loader2,
  RefreshCw,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TABLES, TableInfo } from "@/lib/constants/tables"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TableData {
  success: boolean
  data: any[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DataViewerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableNameParam = searchParams.get("table")

  // Filters state (for input fields)
  const [filters, setFilters] = useState({ companyCode: "", year: "", search: "" })
  // Applied filters (used in SWR key for fetching)
  const [appliedFilters, setAppliedFilters] = useState({ companyCode: "", year: "", search: "" })

  const [downloading, setDownloading] = useState(false)
  const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        // RLS will automatically filter this for Employer Admins
        const { data } = await supabase.from("company_details").select("company_code, company_name").order("company_name")

        if (data) {
          setCompanies(data)
          // Auto-select if only one company (Employer Admin case)
          if (data.length === 1 && !filters.companyCode) {
            setFilters(prev => ({ ...prev, companyCode: data[0].company_code }))
            setAppliedFilters(prev => ({ ...prev, companyCode: data[0].company_code }))
          }
        }
      } catch (e) {
        console.error("Failed to fetch companies", e)
      }
    }
    fetchCompanies()
  }, [])

  // Get selected table info from constants based on URL param
  const selectedTableInfo = TABLES.find((t) => t.name === tableNameParam)

  const currentPage = parseInt(searchParams.get("page") || "1")

  // Reset filters when table changes
  useEffect(() => {
    setFilters({ companyCode: "", year: "", search: "" })
    setAppliedFilters({ companyCode: "", year: "", search: "" })
  }, [tableNameParam])

  // Construct SWR Key
  const queryString = new URLSearchParams({
    table: tableNameParam || "",
    page: currentPage.toString(),
    pageSize: "20",
    ...(appliedFilters.companyCode && { company_code: appliedFilters.companyCode }),
    ...(appliedFilters.year && { year: appliedFilters.year }),
    ...(appliedFilters.search && { search: appliedFilters.search }),
  }).toString()

  const swrKey = tableNameParam ? `/api/table-data?${queryString}` : null

  const { data: apiResponse, error, isLoading, mutate } = useSWR<TableData>(swrKey, fetcher, {
    revalidateOnFocus: false, // Don't auto-fetch when focusing window
    dedupingInterval: 5000, // Cache for 5s
    keepPreviousData: true, // Keep data while fetching new page
  })

  // Derived state
  const tableData = apiResponse?.success ? apiResponse : null
  const loading = isLoading // Backward compatibility alias

  // Helper to sort columns: ID and Name first
  const priorityCols = ["company_code", "employee_id", "dependent_id", "first_name", "last_name", "tax_year", "year"]
  const sortedKeys = tableData && tableData.data && tableData.data.length > 0
    ? Object.keys(tableData.data[0]).sort((a, b) => {
      const idxA = priorityCols.indexOf(a); const idxB = priorityCols.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })
    : []

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/data-viewer?${params.toString()}`)
  }

  const handleRefresh = () => {
    mutate()
  }

  const handleApplyFilters = () => {
    // Reset to page 1
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", "1")
    router.push(`/data-viewer?${params.toString()}`)

    // Apply filters
    // Apply filters
    // If "ALL" is selected, clear the filter
    const applied = { ...filters }
    if (applied.companyCode === "ALL") applied.companyCode = ""
    setAppliedFilters(applied)
  }

  const handleDownload = async () => {
    if (!tableNameParam) return
    setDownloading(true)
    try {
      const isReportTable = ["aca_employee_monthly_status", "aca_employee_monthly_offer", "aca_employee_monthly_enrollment"].includes(tableNameParam)

      if (isReportTable && appliedFilters.companyCode && appliedFilters.year) {
        const response = await fetch(
          `/api/interim/download?tableName=${tableNameParam}&companyCode=${appliedFilters.companyCode}&taxYear=${appliedFilters.year}`,
        )
        if (!response.ok) throw new Error("Download failed")

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${tableNameParam}_${appliedFilters.companyCode}_${appliedFilters.year}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        if (!tableData?.data?.length) return

        const headers = Object.keys(tableData.data[0]).join(",")
        const rows = tableData.data.map((row: any) => Object.values(row).map((v: any) => `"${v}"`).join(","))
        const csvContent = [headers, ...rows].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${tableNameParam}_export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error("Download error:", err)
    } finally {
      setDownloading(false)
    }
  }

  if (!tableNameParam || !selectedTableInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 -m-6 min-h-[calc(100vh-2rem)]">
        <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-slate-100">
          <Database className="h-16 w-16 text-indigo-200" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a Table</h3>
        <p className="text-slate-500 max-w-sm">
          Please select a table from the sidebar to view its contents.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white -m-6 min-h-[calc(100vh-2rem)]">
      {/* Table Header / Toolbar */}
      <div className="border-b px-8 py-4 shrink-0 bg-white shadow-sm z-20 space-y-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 text-indigo-600">
              <TableIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedTableInfo.label}</h2>
                <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-600 border-slate-200">
                  {selectedTableInfo.group}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{selectedTableInfo.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {tableData && (
              <div className="text-right">
                <span className="block text-sm font-semibold text-slate-900">{tableData.pagination.total.toLocaleString()}</span>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">Records</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
          <div className="flex-1 grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <Select
                value={filters.companyCode}
                onValueChange={(val) => setFilters(prev => ({ ...prev, companyCode: val }))}
                disabled={companies.length === 1}
              >
                <SelectTrigger className="h-9 bg-white text-sm">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.length > 1 && <SelectItem value="ALL">All Companies</SelectItem>}
                  {companies.map((c) => (
                    <SelectItem key={c.company_code} value={c.company_code}>
                      {c.company_name} ({c.company_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Year"
                className="h-9 bg-white text-sm"
                type="number"
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              />
            </div>
            <div className="col-span-7">
              <Input
                placeholder="Search Employee ID or Name..."
                className="h-9 bg-white text-sm"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <Button
            className="gap-2 h-9 bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleApplyFilters}
          >
            Search
          </Button>

          <Button
            variant="outline"
            className="gap-2 h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:text-slate-600"
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto relative bg-slate-50/30 p-6">
        <div className="bg-white rounded-lg border shadow-sm h-full overflow-hidden flex flex-col">
          {loading && !tableData ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm text-slate-500">Loading data...</p>
            </div>
          ) : null}

          {tableData?.data ? (
            tableData.data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                No data available
              </div>
            ) : (
              <div className="flex-1 overflow-auto relative max-h-[calc(100vh-280px)]">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50">
                    <tr>
                      {sortedKeys.map((key, index) => (
                        <th key={key}
                          className={cn(
                            "px-6 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap bg-slate-50 sticky top-0",
                            index === 0 && "left-0 z-30 border-r border-slate-200 min-w-[140px]",
                            index === 1 && "left-[140px] z-30 border-r border-slate-200 min-w-[200px]",
                            index > 1 && "z-20 min-w-[150px]"
                          )}
                        >
                          {key.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.data.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-indigo-50/40 transition-colors bg-white group">
                        {sortedKeys.map((key, cellIdx) => {
                          const value = row[key];
                          return (
                            <td key={cellIdx}
                              className={cn(
                                "px-6 py-3 text-slate-600 whitespace-nowrap border-b border-slate-50",
                                cellIdx === 0 && "sticky left-0 z-10 bg-white group-hover:bg-indigo-50/40 border-r border-slate-100 min-w-[140px]",
                                cellIdx === 1 && "sticky left-[140px] z-10 bg-white group-hover:bg-indigo-50/40 border-r border-slate-100 min-w-[200px]",
                                cellIdx > 1 && "min-w-[150px]"
                              )}
                            >
                              {value === null || value === undefined ? (
                                <span className="text-slate-300 text-xs italic">null</span>
                              ) : typeof value === "boolean" ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-5 px-1.5 font-normal text-[10px] border-0",
                                    value ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                                  )}
                                >
                                  {value ? "Yes" : "No"}
                                </Badge>
                              ) : (
                                <span title={String(value)} className="truncate block max-w-xs">{String(value)}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {/* Footer Pagination */}
          {tableData && tableData.pagination.totalPages > 1 && (
            <div className="h-14 border-t px-6 flex items-center justify-between shrink-0 bg-white">
              <div className="text-sm text-slate-500">
                Page <span className="font-medium text-slate-900">{tableData.pagination.page}</span> of <span className="font-medium text-slate-900">{tableData.pagination.totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-9"
                  disabled={tableData.pagination.page === 1}
                  onClick={() => handlePageChange(tableData.pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-9"
                  disabled={tableData.pagination.page === tableData.pagination.totalPages}
                  onClick={() => handlePageChange(tableData.pagination.page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
