"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Download, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ACAFactsDisplay } from "@/components/aca-facts-display"

type FileType =
  | "Company_Details"
  | "Plan_Master"
  | "Employee_Census"
  | "Employee_Address"
  | "Employee_Waiting_Period"
  | "Employee_Plan_Eligibility"
  | "Employee_Plan_Enrollment"
  | "Employee_Dependent"
  | "Plan_Enrollment_Cost"
  | "Payroll_Hours"

interface RowError {
  rowNumber: number
  rowData: Record<string, string>
  error: string
  errorType: "validation" | "database" | "parsing" | "missing_field"
  expectedValue?: string
  receivedValue?: string
  field?: string
}

interface FileUpload {
  type: FileType
  file: File | null
  status: "idle" | "uploading" | "success" | "error"
  message?: string
  processedRows?: number
  totalRows?: number
  failedRows?: number
  uploadTimeMs?: number
  throughput?: number
  errors?: RowError[]
  fileName?: string
}

const fileTypes: {
  type: FileType
  label: string
  description: string
  order: number
}[] = [
    { type: "Company_Details", label: "Company Details", description: "Company info", order: 1 },
    { type: "Plan_Master", label: "Plan Master", description: "Health plans", order: 2 },
    { type: "Employee_Census", label: "Employee Census", description: "Employee data", order: 3 },
    { type: "Employee_Address", label: "Employee Address", description: "Addresses", order: 4 },
    { type: "Employee_Waiting_Period", label: "Waiting Period", description: "Waiting periods", order: 5 },
    { type: "Employee_Plan_Eligibility", label: "Plan Eligibility", description: "Eligibility", order: 6 },
    { type: "Employee_Plan_Enrollment", label: "Plan Enrollment", description: "Enrollments", order: 7 },
    { type: "Employee_Dependent", label: "Dependents", description: "Dependent info", order: 8 },
    { type: "Plan_Enrollment_Cost", label: "Enrollment Cost", description: "Cost data", order: 9 },
    { type: "Payroll_Hours", label: "Payroll Hours", description: "Payroll data", order: 10 },
  ]

export default function ImportPage() {
  const [uploads, setUploads] = useState<FileUpload[]>(
    fileTypes.map((ft) => ({ type: ft.type, file: null, status: "idle" })),
  )
  const [bulkUploading, setBulkUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileSelect = (type: FileType, file: File) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.type === type ? { ...upload, file, status: "idle" as const, message: undefined } : upload,
      ),
    )
  }

  const handleUpload = async (type: FileType) => {
    const upload = uploads.find((u) => u.type === type)
    if (!upload?.file) return

    const uploadStartTime = performance.now()
    setUploads((prev) => prev.map((u) => (u.type === type ? { ...u, status: "uploading" as const } : u)))

    const formData = new FormData()
    formData.append("file", upload.file)
    formData.append("type", type)

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      const uploadTime = performance.now() - uploadStartTime

      if (result.success) {
        setUploads((prev) =>
          prev.map((u) =>
            u.type === type
              ? {
                ...u,
                status: "success" as const,
                message: `${result.processedRows} rows`,
                processedRows: result.processedRows,
                totalRows: result.totalRows,
                failedRows: result.failedRows || 0,
                uploadTimeMs: uploadTime,
                throughput: result.performance?.throughput,
                errors: result.errors,
                fileName: result.fileName,
              }
              : u,
          ),
        )
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.type === type
              ? {
                ...u,
                status: "error" as const,
                message: result.error || "Upload failed",
              }
              : u,
          ),
        )
      }
    } catch (error) {
      setUploads((prev) =>
        prev.map((u) =>
          u.type === type
            ? {
              ...u,
              status: "error" as const,
              message: error instanceof Error ? error.message : "Upload failed",
            }
            : u,
        ),
      )
    }
  }

  const handleBulkUpload = async (filesToUpload: FileUpload[]) => {
    setBulkUploading(true)
    setUploadProgress(0)

    // Sort files by order
    const sortedFiles = [...filesToUpload].sort((a, b) => {
      const aType = fileTypes.find((ft) => ft.type === a.type)
      const bType = fileTypes.find((ft) => ft.type === b.type)
      return (aType?.order || 0) - (bType?.order || 0)
    })

    for (let i = 0; i < sortedFiles.length; i++) {
      const upload = sortedFiles[i]
      if (upload.file) {
        await handleUpload(upload.type)
      }
      setUploadProgress(((i + 1) / sortedFiles.length) * 100)
    }

    setBulkUploading(false)
  }

  const isUploading = uploads.some((u) => u.status === "uploading") || bulkUploading
  const successCount = uploads.filter((u) => u.status === "success").length
  const errorCount = uploads.filter((u) => u.status === "error").length
  const totalRows = uploads.reduce((sum, u) => sum + (u.processedRows || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Import</h1>
          <p className="text-sm text-slate-600 mt-1">Upload CSV files to populate database tables</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-600">{successCount}/10</div>
            <div className="text-xs text-slate-600">Files Imported</div>
          </div>
          {totalRows > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">{totalRows.toLocaleString()}</div>
              <div className="text-xs text-slate-600">Total Rows</div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Toolbar */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-cyan-600" />
              <div>
                <h3 className="font-semibold text-slate-900">Bulk Upload</h3>
                <p className="text-xs text-slate-600">Select multiple CSV files to import all at once</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const fileArray = Array.from(e.target.files)

                    // Create a map of current uploads to easily find matching types
                    const currentUploads = [...uploads]

                    fileArray.forEach(file => {
                      // Normalize filename: remove extension, replace underscores with spaces or keep as is depending on matching strategy
                      // Here we try to match the file type key in the filename
                      const fileName = file.name.toLowerCase()

                      const matchingType = fileTypes.find(ft => {
                        const normalizedType = ft.type.toLowerCase().replace(/_/g, '')
                        const normalizedLabel = ft.label.toLowerCase().replace(/ /g, '')
                        const normalizedFileName = fileName.replace(/_/g, '').replace(/-/g, '').replace(/ /g, '')

                        return normalizedFileName.includes(normalizedType) || normalizedFileName.includes(normalizedLabel)
                      })

                      if (matchingType) {
                        handleFileSelect(matchingType.type, file)
                      }
                    })
                  }
                }}
                className="hidden"
                id="bulk-select"
                disabled={bulkUploading}
              />

              <Button
                onClick={() => document.getElementById('bulk-select')?.click()}
                variant="outline"
                className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                disabled={bulkUploading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Select Files
              </Button>

              <Button
                onClick={() => {
                  const filesToUpload = uploads.filter(u => u.status === 'idle' && u.file)
                  if (filesToUpload.length > 0) {
                    handleBulkUpload(filesToUpload)
                  }
                }}
                disabled={bulkUploading || !uploads.some(u => u.status === 'idle' && u.file)}
              >
                {bulkUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Upload
                  </>
                )}
              </Button>
            </div>
          </div>
          {bulkUploading && uploadProgress > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-cyan-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1 text-center">{Math.round(uploadProgress)}% Complete</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACA Facts Display */}
      {bulkUploading && <ACAFactsDisplay isUploading={bulkUploading} />}

      {/* Import Status Alert */}
      {(successCount > 0 || errorCount > 0) && (
        <Alert className={successCount === 10 ? "border-teal-200 bg-teal-50" : "border-cyan-200 bg-cyan-50"}>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {successCount === 10 ? (
              <span className="font-semibold text-teal-900">✓ All files imported successfully!</span>
            ) : (
              <span className="text-slate-700">
                {successCount} imported, {errorCount} failed, {10 - successCount - errorCount} pending
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ERP-Style Data Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    File Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-64">
                    Selected File
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-32">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">
                    Rows
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-32">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fileTypes.map((fileType, index) => {
                  const upload = uploads.find((u) => u.type === fileType.type)
                  return (
                    <tr
                      key={fileType.type}
                      className={`hover:bg-slate-50 transition-colors ${upload?.status === "success"
                        ? "bg-teal-50/30"
                        : upload?.status === "error"
                          ? "bg-red-50/30"
                          : ""
                        }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">{fileType.order}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 text-sm">{fileType.label}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fileType.description}</td>
                      <td className="px-4 py-3">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(fileType.type, file)
                          }}
                          className="hidden"
                          id={`file-${fileType.type}`}
                          disabled={upload?.status === "uploading"}
                        />
                        <label
                          htmlFor={`file-${fileType.type}`}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <FileText className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                          <span className="text-sm text-slate-600 group-hover:text-cyan-600 transition-colors truncate">
                            {upload?.file?.name || "Choose file..."}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {upload?.status === "idle" && upload?.file && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Ready
                          </span>
                        )}
                        {upload?.status === "uploading" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Uploading
                          </span>
                        )}
                        {upload?.status === "success" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </span>
                        )}
                        {upload?.status === "error" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </span>
                        )}
                        {upload?.status === "idle" && !upload?.file && (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                        {upload?.processedRows ? upload.processedRows.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleUpload(fileType.type)}
                          disabled={!upload?.file || upload?.status === "uploading" || upload?.status === "success"}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                        >
                          {upload?.status === "uploading" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : upload?.status === "success" ? (
                            "Done"
                          ) : (
                            "Upload"
                          )}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {errorCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorCount} file{errorCount > 1 ? "s" : ""} failed to upload. Check the status column for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
