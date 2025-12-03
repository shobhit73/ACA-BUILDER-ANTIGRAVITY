"use client"

import { useState, useEffect } from "react"
import { Database, Loader2, RefreshCw, Table as TableIcon, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TableInfo {
  name: string
  label: string
  description: string
  group: "Foundation" | "Employee Data" | "Plan Data" | "Payroll" | "ACA Interim"
}

const tables: TableInfo[] = [
  { name: "company_details", label: "Company Details", description: "Company information", group: "Foundation" },
  { name: "plan_master", label: "Plan Master", description: "Health plan definitions", group: "Foundation" },
  { name: "employee_census", label: "Employee Census", description: "Employee demographic data", group: "Employee Data" },
  { name: "employee_address", label: "Employee Address", description: "Employee addresses", group: "Employee Data" },
  { name: "employee_waiting_period", label: "Employee Waiting Period", description: "Waiting periods", group: "Employee Data" },
  { name: "employee_plan_eligibility", label: "Employee Plan Eligibility", description: "Plan eligibility", group: "Plan Data" },
  { name: "employee_plan_enrollment", label: "Employee Plan Enrollment", description: "Plan enrollments", group: "Plan Data" },
  { name: "employee_dependent", label: "Employee Dependent", description: "Dependent information", group: "Employee Data" },
  { name: "plan_enrollment_cost", label: "Plan Enrollment Cost", description: "Cost breakdown", group: "Plan Data" },
  { name: "payroll_hours", label: "Payroll Hours", description: "Payroll tracking", group: "Payroll" },
  { name: "aca_employee_monthly_status", label: "ACA Employee Monthly Status", description: "Monthly employment status", group: "ACA Interim" },
  { name: "aca_employee_monthly_offer", label: "ACA Employee Monthly Offer", description: "Monthly coverage offers", group: "ACA Interim" },
  { name: "aca_employee_monthly_enrollment", label: "ACA Employee Monthly Enrollment", description: "Monthly enrollments", group: "ACA Interim" },
]

interface TableData {
  data: any[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export default function DataViewerPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<Record<string, TableData>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({})
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    // Fetch row counts for all tables
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const table of tables) {
        try {
          const response = await fetch(`/api/table-data?table=${table.name}&page=1&pageSize=1`)
          const result = await response.json()
          if (result.success) {
            counts[table.name] = result.pagination.total
          }
        } catch (error) {
          console.error(`Error fetching count for ${table.name}:`, error)
        }
      }
      setTableCounts(counts)
    }
    fetchCounts()
  }, [])

  const fetchTableData = async (tableName: string, page: number = 1) => {
    setLoading((prev) => ({ ...prev, [tableName]: true }))

    try {
      const response = await fetch(`/api/table-data?table=${tableName}&page=${page}&pageSize=50`)
      const result = await response.json()

      if (result.success) {
        setTableData((prev) => ({ ...prev, [tableName]: result }))
        setCurrentPage((prev) => ({ ...prev, [tableName]: page }))
      }
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error)
    } finally {
      setLoading((prev) => ({ ...prev, [tableName]: false }))
    }
  }

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName)
    if (!tableData[tableName]) {
      fetchTableData(tableName)
    }
  }

  const handlePageChange = (tableName: string, newPage: number) => {
    fetchTableData(tableName, newPage)
  }

  const groupedTables = tables.reduce((acc, table) => {
    if (!acc[table.group]) {
      acc[table.group] = []
    }
    acc[table.group].push(table)
    return acc
  }, {} as Record<string, TableInfo[]>)

  const selectedTableInfo = tables.find((t) => t.name === selectedTable)
  const selectedData = selectedTable ? tableData[selectedTable] : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Viewer</h1>
          <p className="text-sm text-slate-600 mt-1">Browse all database tables and their contents</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-600">{tables.length}</div>
            <div className="text-xs text-slate-600">Total Tables</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-600">
              {Object.values(tableCounts).reduce((sum, count) => sum + count, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-600">Total Rows</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Sidebar - Table List */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Tables
                </h3>
              </div>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {Object.entries(groupedTables).map(([group, groupTables]) => (
                  <div key={group} className="border-b last:border-b-0">
                    <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600">
                      {group === "Foundation" && "📋 "}
                      {group === "Employee Data" && "👥 "}
                      {group === "Plan Data" && "📊 "}
                      {group === "Payroll" && "💰 "}
                      {group === "ACA Interim" && "📈 "}
                      {group}
                    </div>
                    {groupTables.map((table) => (
                      <button
                        key={table.name}
                        onClick={() => handleTableSelect(table.name)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-cyan-50 transition-colors flex items-center justify-between ${selectedTable === table.name ? "bg-cyan-100 border-l-2 border-cyan-500" : ""
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">{table.label}</div>
                          <div className="text-xs text-slate-500 truncate">{table.description}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {tableCounts[table.name] !== undefined && (
                            <span className="text-xs font-medium text-cyan-600">
                              {tableCounts[table.name].toLocaleString()}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Table Data */}
        <div className="col-span-9">
          {!selectedTable ? (
            <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
              <CardContent className="p-12 text-center">
                <TableIcon className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Table</h3>
                <p className="text-sm text-slate-600">Choose a table from the left sidebar to view its data</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedTableInfo?.label}</h3>
                    <p className="text-xs text-slate-600 mt-1">{selectedTableInfo?.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedData && (
                      <span className="text-sm text-slate-600">
                        {selectedData.pagination.total.toLocaleString()} rows
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTableData(selectedTable, currentPage[selectedTable] || 1)}
                      disabled={loading[selectedTable]}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading[selectedTable] ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* Table Content */}
                {loading[selectedTable] && !selectedData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                    <span className="ml-2 text-sm text-slate-600">Loading data...</span>
                  </div>
                ) : selectedData?.data ? (
                  <div className="space-y-0">
                    {selectedData.data.length === 0 ? (
                      <Alert className="m-4">
                        <AlertDescription>No data found in this table.</AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-200">
                              <tr>
                                {Object.keys(selectedData.data[0]).map((key) => (
                                  <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700 text-xs uppercase">
                                    {key.replace(/_/g, " ")}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {selectedData.data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  {Object.values(row).map((value: any, cellIdx) => (
                                    <td key={cellIdx} className="px-4 py-2 text-slate-600">
                                      {value === null || value === undefined
                                        ? "-"
                                        : typeof value === "boolean"
                                          ? value
                                            ? "✓"
                                            : "✗"
                                          : String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {selectedData.pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between p-4 border-t bg-slate-50">
                            <div className="text-sm text-slate-600">
                              Page {selectedData.pagination.page} of {selectedData.pagination.totalPages} (
                              {selectedData.pagination.total} total rows)
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={selectedData.pagination.page === 1}
                                onClick={() => handlePageChange(selectedTable, selectedData.pagination.page - 1)}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={selectedData.pagination.page === selectedData.pagination.totalPages}
                                onClick={() => handlePageChange(selectedTable, selectedData.pagination.page + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
