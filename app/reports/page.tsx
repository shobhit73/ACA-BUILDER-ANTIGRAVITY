"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Loader2, CheckCircle, AlertCircle, FileOutput, Calendar, Building2 } from "lucide-react"

export default function ReportsPage() {
  const [companyCode, setCompanyCode] = useState("")
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Generate Reports</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create and download ACA interim tables for IRS Form 1095-C preparation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-sm font-medium text-blue-900">Interim Tables</div>
            <div className="text-xs text-blue-600">Monthly Tracking</div>
          </div>
        </div>
      </div>

      {/* Generate Section */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileOutput className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Generate Tables</CardTitle>
              <CardDescription>Process imported data to create monthly tracking tables</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyCode" className="flex items-center gap-2 text-slate-700">
                <Building2 className="h-4 w-4 text-blue-500" />
                Company Code
              </Label>
              <Input
                id="companyCode"
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="e.g., COMP001"
                disabled={isGenerating}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxYear" className="flex items-center gap-2 text-slate-700">
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
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !taxYear || !companyCode}
              className="bg-blue-600 hover:bg-blue-700 min-w-[150px] text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Tables"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-slide-in-up">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isGenerated && (
            <Alert className="border-green-200 bg-green-50 animate-slide-in-up">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                Interim tables generated successfully! You can now download the files below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Download Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            name: "aca_employee_monthly_status",
            title: "Monthly Status",
            description: "Employment status & hours",
            color: "blue",
          },
          {
            name: "aca_employee_monthly_offer",
            title: "Monthly Offer",
            description: "Coverage eligibility & offers",
            color: "cyan",
          },
          {
            name: "aca_employee_monthly_enrollment",
            title: "Monthly Enrollment",
            description: "Enrollment & cost details",
            color: "teal",
          },
        ].map((file) => (
          <Card key={file.name} className="hover:shadow-md transition-shadow border-slate-200 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{file.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{file.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file.name)}
                  disabled={downloadingFile === file.name || !companyCode}
                  className="w-full border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  {downloadingFile === file.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="p-2 bg-white rounded-full border border-slate-200 h-fit">
              <AlertCircle className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900">About Interim Tables</h4>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                The interim tables consolidate your base data into three monthly tracking files that serve as the
                foundation for IRS Form 1095-C preparation. These tables track employee status, coverage offers, and
                enrollment details for each month of the tax year.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
