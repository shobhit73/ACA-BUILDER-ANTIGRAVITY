"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Loader2, CheckCircle, AlertCircle, FileOutput, Calendar, Building2, Table as TableIcon, Eye } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ReportsPage() {
  const [companyCode, setCompanyCode] = useState("")
  const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  useState(() => {
    const fetchCompanies = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data } = await supabase.from("company_details").select("company_code, company_name")
        if (data) setCompanies(data)
      } catch (e) {
        console.error("Failed to fetch companies", e)
      }
    }
    fetchCompanies()
  })

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setIsGenerated(false)

    try {
      const response = await fetch("/api/interim/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode,
          taxYear: Number.parseInt(taxYear),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate interim tables")
      }

      setIsGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (tableName: string) => {
    setDownloadingFile(tableName)
    setError(null)

    try {
      const response = await fetch(
        `/api/interim/download?tableName=${tableName}&companyCode=${companyCode}&taxYear=${taxYear}`,
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to download file")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${tableName}_${companyCode}_${taxYear}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setDownloadingFile(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30 -m-6 min-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="h-16 border-b px-8 flex items-center justify-between shrink-0 bg-white shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 text-blue-600">
            <FileOutput className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Generate Reports</h1>
            <p className="text-sm text-slate-500">Create ACA interim tables for IRS Form 1095-C</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-slate-900">System Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Generate Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <TableIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Generate Tables</h2>
                <p className="text-slate-500 mt-1">Process your imported census and payroll data to generate the monthly tracking tables required for ACA reporting.</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="max-w-4xl">
              <div className="grid gap-8 md:grid-cols-2 items-start">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="companyCode" className="flex items-center gap-2 text-slate-700 font-medium">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      Company Code
                    </Label>
                    <Select value={companyCode} onValueChange={setCompanyCode} disabled={isGenerating}>
                      <SelectTrigger className="h-11 border-slate-200 focus:ring-blue-500 bg-slate-50/50">
                        <SelectValue placeholder="Select Company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.company_code} value={c.company_code}>
                            {c.company_name} ({c.company_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="taxYear" className="flex items-center gap-2 text-slate-700 font-medium">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Tax Year
                    </Label>
                    <Input
                      id="taxYear"
                      type="number"
                      value={taxYear}
                      onChange={(e) => setTaxYear(e.target.value)}
                      placeholder="2024"
                      min="2000"
                      max="2100"
                      disabled={isGenerating}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-6">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !taxYear || !companyCode}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 transition-all font-medium text-base"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Data...
                        </>
                      ) : (
                        "Generate Tables"
                      )}
                    </Button>
                  </div>

                  {isGenerated && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
                      <CheckCircle className="h-5 w-5" />
                      Interim tables generated successfully!
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Info Sidebar */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    Preview
                  </h3>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>
                      This process will generate the following monthly tracking data for each employee:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-slate-500">
                      <li>Eligibility Status</li>
                      <li>Offer of Coverage</li>
                      <li>Enrollment Status</li>
                    </ul>
                    <div className="pt-4 mt-2 border-t border-slate-200/60">
                      <p className="text-xs text-slate-400">
                        Note: Existing data for this company and year will be recalculated.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
