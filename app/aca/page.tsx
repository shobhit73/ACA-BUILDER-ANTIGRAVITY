"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle2, AlertCircle, Download, FileText, LogOut, ArrowLeft, Shield } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generate1095CForEmployee, generate1095CForAllEmployeesZip } from "../actions/generate-1095c"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

export default function AcaPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingAca, setDownloadingAca] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [selectedYear, setSelectedYear] = useState("2025")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [msg, setMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [downloadingPenalty, setDownloadingPenalty] = useState(false)

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  async function handleUpload() {
    if (!file) {
      setMsg("Please choose an .xlsx file.")
      setIsSuccess(false)
      return
    }
    setBusy(true)
    setProcessing(true)
    setMsg(null)
    setIsSuccess(false)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("year", "2025")

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      setMsg(
        json.error ||
        (res.ok
          ? "✅ Data processed successfully! You can now download derived tables, ACA reports, penalty dashboards, and generate Form 1095-C PDFs."
          : "Upload failed"),
      )
      setIsSuccess(res.ok)
    } catch (error) {
      setMsg("An error occurred during upload")
      setIsSuccess(false)
    } finally {
      setBusy(false)
      setProcessing(false)
    }
  }


  // ... existing imports ...

  // ... inside component ...

  async function handleDownload() {
    console.log("[v0] handleDownload started")
    setDownloading(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      console.log("[v0] Fetching /api/download-tables")
      const res = await fetch("/api/download-tables")
      console.log("[v0] Response status:", res.status)

      if (!res.ok) {
        const json = await res.json()
        console.error("[v0] Download failed:", json)
        setMsg(json.error || "Download failed")
        setIsSuccess(false)
        return
      }

      const data = await res.json()
      console.log("[v0] Data received:", data)

      // Generate Excel file client-side
      console.log("[v0] Generating Excel file...")
      const wb = XLSX.utils.book_new()

      // Add sheets for each table
      if (data.dailyStatus) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dailyStatus), "Employee Status - Daily")
      if (data.monthlyStatus) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.monthlyStatus), "Employee Status - Monthly")
      if (data.dailyEligibility) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dailyEligibility), "Eligibility - Daily")
      if (data.monthlyEligibility) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.monthlyEligibility), "Eligibility - Monthly")
      if (data.dailyEnrollment) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dailyEnrollment), "Enrollment - Daily")
      if (data.monthlyEnrollment) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.monthlyEnrollment), "Enrollment - Monthly")
      if (data.dailyDepEnrollment) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dailyDepEnrollment), "Dependent Enrollment - Daily")
      if (data.monthlyDepEnrollment) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.monthlyDepEnrollment), "Dependent Enrollment - Monthly")

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      console.log("[v0] Excel buffer created, size:", excelBuffer.byteLength)

      // Convert to base64 for data URL
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const filename = `census_tables_${new Date().toISOString().split("T")[0]}.xlsx`

      console.log("[v0] Creating download with blob URL")
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.setAttribute('href', url)
      a.setAttribute('download', filename)
      a.style.display = 'none'
      document.body.appendChild(a)

      console.log("[v0] Triggering download for:", filename)
      a.click()

      setTimeout(() => {
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log("[v0] Cleanup done")
      }, 100)

      setMsg("Tables downloaded successfully!")
      setIsSuccess(true)
    } catch (error) {
      console.error("[v0] Error in handleDownload:", error)
      setMsg("An error occurred during download")
      setIsSuccess(false)
    } finally {
      setDownloading(false)
      console.log("[v0] handleDownload finished")
    }
  }

  async function handleDownloadAca() {
    console.log("[v0] handleDownloadAca started")
    setDownloadingAca(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      console.log("[v0] Fetching /api/download-aca")
      const res = await fetch("/api/download-aca")
      console.log("[v0] Response status:", res.status)

      if (!res.ok) {
        const json = await res.json()
        console.error("[v0] Download failed:", json)
        setMsg(json.error || "ACA report download failed")
        setIsSuccess(false)
        return
      }

      const data = await res.json()
      console.log("[v0] Data received:", data)

      // Generate CSV client-side
      console.log("[v0] Generating CSV...")
      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      console.log("[v0] CSV generated, length:", csv.length)

      // Use data URL instead of blob URL - more reliable for Chrome
      const BOM = "\uFEFF"
      const csvWithBOM = BOM + csv
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM)
      const filename = `employee_aca_monthly_${new Date().toISOString().split("T")[0]}.csv`

      console.log("[v0] Creating download with data URL")
      const a = document.createElement('a')
      a.setAttribute('href', dataUrl)
      a.setAttribute('download', filename)
      a.style.display = 'none'
      document.body.appendChild(a)

      console.log("[v0] Triggering download for:", filename)
      a.click()

      setTimeout(() => {
        document.body.removeChild(a)
        console.log("[v0] Cleanup done")
      }, 100)

      setMsg("ACA monthly report downloaded successfully!")
      setIsSuccess(true)
    } catch (error) {
      console.error("[v0] Error in handleDownloadAca:", error)
      setMsg("An error occurred during ACA report download")
      setIsSuccess(false)
    } finally {
      setDownloadingAca(false)
      console.log("[v0] handleDownloadAca finished")
    }
  }

  async function handleGenerateSinglePdf() {
    if (!selectedEmployee) {
      setMsg("Please select an employee")
      setIsSuccess(false)
      return
    }

    setGeneratingPdf(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      const result = await generate1095CForEmployee(Number.parseInt(selectedEmployee), Number.parseInt(selectedYear))

      const pdfBytes = new Uint8Array(result.pdfBytes)
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()

      // Fix: Wait for download to start before revoking URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 2000)

      setMsg("Form 1095-C generated successfully!")
      setIsSuccess(true)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to generate PDF")
      setIsSuccess(false)
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleGenerateBulkPdf() {
    setGeneratingPdf(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      const result = await generate1095CForAllEmployeesZip(Number.parseInt(selectedYear))

      const zipBytes = new Uint8Array(result.zipBytes)
      const blob = new Blob([zipBytes], { type: "application/zip" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()

      // Fix: Wait for download to start before revoking URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 2000)

      setMsg(`Generated ZIP file with all Form 1095-C PDFs successfully!`)
      setIsSuccess(true)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to generate PDFs")
      setIsSuccess(false)
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleDownloadPenaltyDashboard() {
    setDownloadingPenalty(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      // Direct navigation for Excel download
      window.location.href = `/api/penalty-dashboard?year=${selectedYear}`;

      setMsg("Download started! Check your downloads folder.")
      setIsSuccess(true)
    } catch (error) {
      setMsg("An error occurred during penalty dashboard download")
      setIsSuccess(false)
    } finally {
      setDownloadingPenalty(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/home")}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Modules
              </Button>
              <div className="h-6 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Compliance Suite</span>
                <span className="text-white/60">/</span>
                <span className="text-accent">ACA Reporting</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/80">naveen</span>
              <div className="h-4 w-px bg-white/20" />
              <Button
                onClick={() => router.push('/admin/companies')}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <Shield className="h-4 w-4 mr-2" />
                Add Company
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="border-2 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-medium">ACA-1095 Builder</CardTitle>
            <CardDescription className="text-sm">
              Upload your census file with sheets as Employee Demographic, Enrollment, Eligibility and Dependent
              Enrollment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {msg && (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription className="ml-2">{msg}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <Label htmlFor="file-upload" className="text-sm font-medium">
                    Select Excel File (.xlsx)
                  </Label>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                  className="cursor-pointer h-10"
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <Button onClick={handleUpload} disabled={busy || !file} className="w-full sm:w-auto h-10" size="default">
                {busy ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Reports */}
              <div className="space-y-3 border rounded-lg p-4 bg-card hover:bg-muted/10 transition-colors">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" /> Data & Reports
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Derived tables (Status, Eligibility, etc.)</p>
                    <Button
                      onClick={handleDownload}
                      disabled={downloading || processing}
                      variant="outline"
                      className="w-full h-9 text-sm justify-start bg-transparent"
                    >
                      {downloading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Derived Tables
                        </>
                      )}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">ACA monthly report (Lines 14 & 16)</p>
                    <Button
                      onClick={handleDownloadAca}
                      disabled={downloadingAca || processing}
                      variant="outline"
                      className="w-full h-9 text-sm justify-start bg-transparent"
                    >
                      {downloadingAca ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Preparing CSV...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          ACA Report (CSV)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Column 2: Penalty Analysis */}
              <div className="space-y-3 border rounded-lg p-4 bg-card hover:bg-muted/10 transition-colors">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <Shield className="h-4 w-4" /> Penalty Analysis
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Penalty Dashboard (Analysis)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleDownloadPenaltyDashboard}
                        disabled={downloadingPenalty || processing}
                        variant="outline"
                        className="h-9 text-xs px-2 bg-transparent"
                      >
                        {downloadingPenalty ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Excel
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => router.push(`/aca/penalty-dashboard?year=${selectedYear}`)}
                        disabled={processing}
                        variant="outline"
                        className="h-9 text-xs px-2"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        View Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Form 1095-C */}
              <div className="space-y-3 border rounded-lg p-4 bg-card hover:bg-muted/10 transition-colors">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" /> Form 1095-C PDFs
                </h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="year-select" className="text-xs mb-1 block">
                        Tax Year
                      </Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year-select" className="h-8 text-xs">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="employee-select" className="text-xs mb-1 block">
                        Emp ID (Optional)
                      </Label>
                      <Input
                        id="employee-select"
                        type="number"
                        placeholder="ID"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      onClick={handleGenerateSinglePdf}
                      disabled={generatingPdf || !selectedEmployee || processing}
                      variant="outline"
                      className="h-9 text-xs px-1 bg-transparent"
                    >
                      {generatingPdf ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Single PDF
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleGenerateBulkPdf}
                      disabled={generatingPdf || !!selectedEmployee || processing}
                      variant="outline"
                      className="h-9 text-xs px-1 bg-transparent"
                    >
                      {generatingPdf ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Bulk ZIP
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
