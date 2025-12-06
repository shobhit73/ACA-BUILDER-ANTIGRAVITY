"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Download, AlertTriangle, Info, AlertCircle, Eye, FileSpreadsheet, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
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
  const [selectedErrorFile, setSelectedErrorFile] = useState<FileUpload | null>(null)

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
                errors: result.errors, // Populate errors even on absolute failure if available
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

  // Determine status color/icon helper
  const getStatusDisplay = (upload: FileUpload | undefined) => {
    if (!upload) return null;

    // Status Logic:
    // 1. Logic Error: Success but 0 processed rows? -> Failed
    // 2. Partial Success: Success but >0 failed rows? -> Warning
    // 3. Normal Success
    // 4. API Error

    if (upload.status === "uploading") {
      return (
        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-normal">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading
        </Badge>
      )
    }

    if (upload.status === "success") {
      if ((upload.processedRows === 0 || upload.processedRows === undefined) && (upload.totalRows || 0) > 0) {
        return (
          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-100 font-normal hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" /> Failed (0 rows)
          </Badge>
        )
      }
      if ((upload.failedRows || 0) > 0) {
        return (
          <Badge variant="default" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-normal">
            <AlertCircle className="h-3 w-3 mr-1" /> Partial ({upload.failedRows} err)
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal shadow-none">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Success
        </Badge>
      )
    }

    if (upload.status === "error") {
      return (
        <Badge variant="destructive" className="font-normal">
          <XCircle className="h-3 w-3 mr-1" /> Error
        </Badge>
      )
    }

    if (upload.status === "idle" && upload.file) {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-normal">
          Ready
        </Badge>
      )
    }

    return <span className="text-xs text-slate-400 font-mono">-</span>
  }

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
            <div className="text-2xl font-bold text-indigo-600">{successCount}/10</div>
            <div className="text-xs text-slate-600">Files Imported</div>
          </div>
          {totalRows > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-700">{totalRows.toLocaleString()}</div>
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
              <Upload className="h-5 w-5 text-indigo-600" />
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
                    const currentUploads = [...uploads]

                    fileArray.forEach(file => {
                      const fileName = file.name.toLowerCase()

                      // 1. Try to find an exact TYPE match first (Most precise)
                      let matchingType = fileTypes.find(ft => {
                        const normalizedType = ft.type.toLowerCase().replace(/_/g, '')
                        const normalizedFileName = fileName.replace(/_/g, '').replace(/-/g, '').replace(/ /g, '')
                        return normalizedFileName.includes(normalizedType)
                      })

                      // 2. If no type match, try LABEL matching (fallback)
                      if (!matchingType) {
                        matchingType = fileTypes.find(ft => {
                          const normalizedLabel = ft.label.toLowerCase().replace(/ /g, '')
                          const normalizedFileName = fileName.replace(/_/g, '').replace(/-/g, '').replace(/ /g, '')
                          return normalizedFileName.includes(normalizedLabel)
                        })
                      }

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
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
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
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
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
        <Alert className={successCount === 10 ? "border-emerald-200 bg-emerald-50" : "border-indigo-200 bg-indigo-50"}>
          <Info className={`h-4 w-4 ${successCount === 10 ? 'text-emerald-600' : 'text-indigo-600'}`} />
          <AlertDescription>
            {successCount === 10 ? (
              <span className="font-semibold text-emerald-900">✓ All files imported successfully!</span>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-24">
                    Template
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
                  const hasErrors = (upload?.errors?.length || 0) > 0 || (upload?.failedRows || 0) > 0

                  return (
                    <tr
                      key={fileType.type}
                      className={`group transition-colors border-b border-slate-50 last:border-0 ${upload?.status === "success" && (upload.processedRows || 0) > 0
                        ? "bg-slate-50/50 hover:bg-indigo-50/20"
                        : "hover:bg-slate-50"
                        }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">{fileType.order}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 text-sm">{fileType.label}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fileType.description}</td>
                      <td className="px-6 py-4">
                        <a
                          href={`/templates/${fileType.type}.csv`}
                          download={`${fileType.type}_Template.csv`}
                          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Download Template"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          <span className="hidden lg:inline">Template</span>
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileSelect(fileType.type, file)
                              // Reset input value
                              e.target.value = ''
                            }}
                            className="hidden"
                            id={`file-${fileType.type}`}
                            disabled={upload?.status === "uploading"}
                          />
                          <label
                            htmlFor={`file-${fileType.type}`}
                            className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${upload?.file
                              ? "bg-indigo-50/50 border-indigo-200 text-indigo-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50"
                              }`}
                          >
                            <FileText className={`h-4 w-4 flex-shrink-0 ${upload?.file ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className="truncate font-medium">
                              {upload?.file?.name || "Select CSV file..."}
                            </span>
                          </label>

                          {upload?.file && upload.status === "idle" && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setUploads((prev) =>
                                  prev.map((u) =>
                                    u.type === fileType.type ? { ...u, file: null, status: "idle", message: undefined } : u
                                  )
                                )
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusDisplay(upload)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                        {upload?.status === 'success' || upload?.processedRows ? (upload?.processedRows || 0).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpload(fileType.type)}
                            disabled={!upload?.file || upload?.status === "uploading" || (upload?.status === "success" && (upload.processedRows || 0) > 0 && !hasErrors)}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                          >
                            {upload?.status === "uploading" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : upload?.status === "success" && (upload.processedRows || 0) > 0 && !hasErrors ? (
                              "Done"
                            ) : (
                              "Upload"
                            )}
                          </Button>
                          {hasErrors && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => upload && setSelectedErrorFile(upload)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="View Errors"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Detail Error Dialog */}
      <Dialog open={!!selectedErrorFile} onOpenChange={(open) => !open && setSelectedErrorFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Import Errors: {selectedErrorFile?.file?.name}
            </DialogTitle>
            <DialogDescription>
              The following errors occurred during import.
              {selectedErrorFile?.processedRows !== undefined && (
                <span className="block mt-1 font-medium text-slate-700">
                  Success: {selectedErrorFile.processedRows}, Failed: {selectedErrorFile.failedRows || 0}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-slate-50">
            {selectedErrorFile?.errors && selectedErrorFile.errors.length > 0 ? (
              <div className="space-y-4">
                {selectedErrorFile.errors.map((err, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-red-100 shadow-sm">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-red-700 text-sm">Row {err.rowNumber}</span>
                      <span className="text-xs text-slate-500 uppercase px-2 py-0.5 bg-slate-100 rounded">{err.errorType}</span>
                    </div>
                    <p className="text-sm text-slate-800 mt-1">{err.error}</p>
                    {err.field && <p className="text-xs text-slate-600 mt-1">Field: <span className="font-mono">{err.field}</span></p>}
                    {err.receivedValue && (
                      <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 overflow-x-auto">
                        <span className="font-semibold text-slate-500">Data:</span>
                        <pre className="mt-1">{err.receivedValue}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p>No detailed row errors found.</p>
                <p className="text-xs">If the file failed completely, check the general status message.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
