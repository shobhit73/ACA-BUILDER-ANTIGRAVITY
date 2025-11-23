"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle2, AlertCircle, Download, FileText, LogOut } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generate1095CForEmployee, generate1095CForAllEmployees } from "./actions/generate-1095c"

export default function Page() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingAca, setDownloadingAca] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [selectedYear, setSelectedYear] = useState("2025")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [msg, setMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [downloadingPenalty, setDownloadingPenalty] = useState(false)

  useEffect(() => {
    router.push("/home")
  }, [router])

  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to Compliance Suite...</p>
        </div>
      </div>
    )
  }

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
            ? "Census data uploaded successfully! Daily and monthly tables have been populated."
            : "Upload failed"),
      )
      setIsSuccess(res.ok)
    } catch (error) {
      setMsg("An error occurred during upload")
      setIsSuccess(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      const res = await fetch("/api/download-tables")
      if (!res.ok) {
        const json = await res.json()
        setMsg(json.error || "Download failed")
        setIsSuccess(false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `census_tables_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMsg("Tables downloaded successfully!")
      setIsSuccess(true)
    } catch (error) {
      setMsg("An error occurred during download")
      setIsSuccess(false)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadAca() {
    setDownloadingAca(true)
    setMsg(null)
    setIsSuccess(false)

    try {
      const res = await fetch("/api/download-aca")
      if (!res.ok) {
        const json = await res.json()
        setMsg(json.error || "ACA report download failed")
        setIsSuccess(false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `employee_aca_monthly_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMsg("ACA monthly report downloaded successfully!")
      setIsSuccess(true)
    } catch (error) {
      setMsg("An error occurred during ACA report download")
      setIsSuccess(false)
    } finally {
      setDownloadingAca(false)
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
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

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
      const results = await generate1095CForAllEmployees(Number.parseInt(selectedYear))

      if (results.length === 0) {
        setMsg("No employees found")
        setIsSuccess(false)
        return
      }

      for (const result of results) {
        const pdfBytes = new Uint8Array(result.pdfBytes)
        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      setMsg(`Generated ${results.length} Form 1095-C PDFs successfully!`)
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
      const res = await fetch(`/api/penalty-dashboard?year=${selectedYear}`)
      if (!res.ok) {
        const json = await res.json()
        setMsg(json.error || "Penalty dashboard download failed")
        setIsSuccess(false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Penalty_Dashboard_${selectedYear}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMsg("Penalty dashboard downloaded successfully!")
      setIsSuccess(true)
    } catch (error) {
      setMsg("An error occurred during penalty dashboard download")
      setIsSuccess(false)
    } finally {
      setDownloadingPenalty(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-medium">ACA-1095 Builder</CardTitle>
              <CardDescription className="text-base text-chart-2">
                Upload your census file with sheets as Employee Demographic, Enrollment, Eligibility and Dependent
                Enrollment
              </CardDescription>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="ml-4 bg-transparent">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <Label htmlFor="file-upload" className="text-base font-medium">
                Select Excel File (.xlsx)
              </Label>
            </div>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <Button onClick={handleUpload} disabled={busy || !file} className="w-full h-12 text-base" size="lg">
            {busy ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload & Process Data
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Download processed tables (daily status, monthly status, eligibility, enrollment)
            </p>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
              className="w-full h-12 text-base bg-transparent"
              size="lg"
            >
              {downloading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download Census Tables
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Download ACA monthly report (IRS Form 1095-C Line 14 & Line 16 codes)
            </p>
            <Button
              onClick={handleDownloadAca}
              disabled={downloadingAca}
              variant="outline"
              className="w-full h-12 text-base bg-transparent"
              size="lg"
            >
              {downloadingAca ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Preparing ACA CSV...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download ACA Report (CSV)
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Generate penalty dashboard (Penalty A & B analysis for all employees)
            </p>
            <Button
              onClick={handleDownloadPenaltyDashboard}
              disabled={downloadingPenalty}
              variant="outline"
              className="w-full h-12 text-base bg-transparent"
              size="lg"
            >
              {downloadingPenalty ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating Dashboard...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Build Penalty Dashboard
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Generate IRS Form 1095-C PDFs (Part I & II with Lines 14 & 16)
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="year-select" className="text-sm mb-1.5 block">
                    Tax Year
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year-select">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label htmlFor="employee-select" className="text-sm mb-1.5 block">
                    Employee (Optional)
                  </Label>
                  <Input
                    id="employee-select"
                    type="number"
                    placeholder="Employee ID"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleGenerateSinglePdf}
                  disabled={generatingPdf || !selectedEmployee}
                  variant="outline"
                  className="h-11 bg-transparent"
                >
                  {generatingPdf ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Single Employee
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleGenerateBulkPdf}
                  disabled={generatingPdf}
                  variant="outline"
                  className="h-11 bg-transparent"
                >
                  {generatingPdf ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      All Employees
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {msg && (
            <Alert variant={isSuccess ? "default" : "destructive"}>
              {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className="ml-2">{msg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
