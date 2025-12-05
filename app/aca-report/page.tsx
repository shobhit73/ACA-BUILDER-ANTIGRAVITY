"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Loader2,
    FileSpreadsheet,
    Calculator,
    AlertCircle,
    CheckCircle2,
    Download,
    RefreshCw,
    Search
} from "lucide-react"
import { toast } from "sonner"

interface ACARecord {
    id: number
    company_code: string
    employee_id: string
    tax_year: number
    month: number
    line_14_code: string
    line_15_cost: number | null
    line_16_code: string | null
    employee_census: {
        first_name: string
        last_name: string
    }
}

export default function ACAReportPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [records, setRecords] = useState<ACARecord[]>([])
    const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])
    const [companyCode, setCompanyCode] = useState("")
    const [taxYear, setTaxYear] = useState("2025")
    const [stats, setStats] = useState({ totalEmployees: 0, codesGenerated: 0 })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchCompanies()
    }, [])

    useEffect(() => {
        if (companyCode) {
            fetchReport()
        }
    }, [page, companyCode, taxYear, searchQuery])

    const fetchCompanies = async () => {
        try {
            const { createClient } = await import("@/lib/supabase/client")
            const supabase = createClient()
            const { data, error } = await supabase.from("company_details").select("company_code, company_name")

            if (data && data.length > 0) {
                setCompanies(data)
                setCompanyCode(data[0].company_code) // Default to first company
            }
        } catch (error) {
            console.error("Failed to fetch companies", error)
        }
    }

    const fetchReport = async () => {
        if (!companyCode) return
        setIsLoading(true)
        try {
            const res = await fetch(
                `/api/aca-report/list?companyCode=${companyCode}&taxYear=${taxYear}&page=${page}&limit=20&search=${searchQuery}`
            )
            const data = await res.json()
            if (data.success) {
                setRecords(data.data)
                setTotalPages(data.pagination.totalPages)
                setStats({
                    totalEmployees: data.pagination.total, // Approximation
                    codesGenerated: data.pagination.total * 3 // 3 codes per record
                })
            }
        } catch (error) {
            console.error("Failed to fetch report:", error)
            toast.error("Failed to load report data")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!companyCode) {
            toast.error("Please select a company first")
            return
        }
        setIsGenerating(true)
        try {
            const res = await fetch("/api/aca-report/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyCode, taxYear: parseInt(taxYear) }),
            })
            const data = await res.json()

            if (data.success) {
                toast.success("ACA Codes Generated Successfully!")
                fetchReport() // Refresh data
            } else {
                toast.error(`Generation Failed: ${data.error}`)
            }
        } catch (error) {
            console.error("Generation error:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownload = () => {
        if (!companyCode) return
        // Trigger download directly
        window.location.href = `/api/aca-report/download?companyCode=${companyCode}&taxYear=${taxYear}`
        toast.success("Download started!")
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        ACA Monthly Report
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Generate and review IRS 1095-C Line 14, 15, and 16 codes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={companyCode} onValueChange={setCompanyCode}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map((company) => (
                                <SelectItem key={company.company_code} value={company.company_code}>
                                    {company.company_name} ({company.company_code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={taxYear} onValueChange={setTaxYear}>
                        <SelectTrigger className="w-[120px] bg-white">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Calculator className="mr-2 h-4 w-4" />
                                Generate Codes
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleDownload}
                        className="border-blue-200 hover:bg-blue-50 text-blue-700"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download Excel
                    </Button>
                </div>
            </div>

            {/* <Stats Cards Removed> */}

            {/* Main Data Grid */}
            <Card className="border-slate-200 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-slate-800">ACA Report Data</CardTitle>
                        <CardDescription>
                            Review calculated codes for each employee.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 bg-white border-slate-200 focus-visible:ring-blue-500"
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchReport} disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-auto max-h-[calc(100vh-280px)] relative">
                        <table className="w-full text-sm caption-bottom border-separate border-spacing-0">
                            <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[100px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Emp ID</TableHead>
                                    <TableHead className="w-[200px] sticky left-[100px] z-30 bg-slate-50 border-r border-slate-200">Name</TableHead>
                                    <TableHead className="w-[80px]">Month</TableHead>
                                    <TableHead className="text-center w-[100px]">Line 14 (Offer)</TableHead>
                                    <TableHead className="text-center w-[100px]">Line 15 (Cost)</TableHead>
                                    <TableHead className="text-center w-[150px]">Line 16 (Safe Harbor)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Loading data...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <AlertCircle className="h-8 w-8 text-slate-300" />
                                                <p>No records found. Click "Generate Codes" to calculate.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="font-medium text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{record.employee_id}</TableCell>
                                            <TableCell className="sticky left-[100px] z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{record.employee_census.last_name}, {record.employee_census.first_name}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                                    {record.month}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.line_14_code === '1H' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {record.line_14_code || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                {record.line_15_cost ? `$${record.line_15_cost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.line_16_code === '2C' ? 'bg-emerald-100 text-emerald-800' :
                                                    record.line_16_code === '2A' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                    {record.line_16_code || '-'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-slate-50/30">
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
