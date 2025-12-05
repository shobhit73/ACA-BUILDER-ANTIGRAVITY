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
import {
    Loader2,
    AlertTriangle,
    DollarSign,
    RefreshCw,
    Search,
    AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface PenaltyRecord {
    id: number
    employee_id: string
    penalty_type: 'A' | 'B'
    reason: string
    jan_amount: number
    feb_amount: number
    mar_amount: number
    apr_amount: number
    may_amount: number
    jun_amount: number
    jul_amount: number
    aug_amount: number
    sep_amount: number
    oct_amount: number
    nov_amount: number
    dec_amount: number
    total_amount: number
}

export default function ACAPenaltiesPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [records, setRecords] = useState<PenaltyRecord[]>([])
    const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])
    const [companyCode, setCompanyCode] = useState("")
    const [taxYear, setTaxYear] = useState("2025")
    const [summary, setSummary] = useState({ totalPenaltyA: 0, totalPenaltyB: 0, grandTotal: 0 })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        checkUserRole()
        fetchCompanies()
    }, [])

    const checkUserRole = async () => {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user && user.user_metadata.role !== "super_admin") {
            // Redirect regular users to their allowed page
            window.location.href = "/pdf-1095c"
        }
    }

    useEffect(() => {
        if (companyCode) {
            fetchPenalties()
        }
    }, [page, companyCode, taxYear, searchQuery])

    const fetchCompanies = async () => {
        try {
            const { createClient } = await import("@/lib/supabase/client")
            const supabase = createClient()
            const { data } = await supabase.from("company_details").select("company_code, company_name")

            if (data && data.length > 0) {
                setCompanies(data)
                setCompanyCode(data[0].company_code)
            }
        } catch (error) {
            console.error("Failed to fetch companies", error)
        }
    }

    const fetchPenalties = async () => {
        if (!companyCode) return
        setIsLoading(true)
        try {
            const res = await fetch(
                `/api/aca-penalties?companyCode=${companyCode}&taxYear=${taxYear}&page=${page}&limit=20&search=${searchQuery}`
            )
            const data = await res.json()
            if (data.success) {
                setRecords(data.data)
                setSummary(data.summary)
                setTotalPages(data.pagination.totalPages)
            }
        } catch (error) {
            console.error("Failed to fetch penalties:", error)
            toast.error("Failed to load penalty data")
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
            const res = await fetch("/api/aca-penalties", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyCode, taxYear: parseInt(taxYear) }),
            })
            const data = await res.json()

            if (data.success) {
                toast.success("Penalties Calculated Successfully!")
                fetchPenalties()
            } else {
                toast.error(`Calculation Failed: ${data.error}`)
            }
        } catch (error) {
            console.error("Generation error:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setIsGenerating(false)
        }
    }

    const formatCurrency = (amount: number) => {
        if (!amount || amount === 0) return "-"
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        ACA Penalty Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor potential IRS penalties (Type A & B) based on coverage offers.
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
                                Calculating...
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Calculate Penalties
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Penalty A</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalPenaltyA)}</div>
                        <p className="text-xs text-slate-500">No MEC Offered ($241.67/mo)</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Penalty B</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalPenaltyB)}</div>
                        <p className="text-xs text-slate-500">Unaffordable Coverage ($362.50/mo)</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Grand Total Liability</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.grandTotal)}</div>
                        <p className="text-xs text-slate-500">Total Potential Exposure</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Data Grid */}
            <Card className="border-slate-200 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-slate-800">Penalty Details</CardTitle>
                        <CardDescription>
                            Detailed breakdown of penalties by employee and month.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by ID or Reason..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 bg-white border-slate-200 focus-visible:ring-blue-500"
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchPenalties} disabled={isLoading}>
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
                                    <TableHead className="w-[400px]">Reason</TableHead>
                                    <TableHead className="text-center w-[80px]">Jan</TableHead>
                                    <TableHead className="text-center w-[80px]">Feb</TableHead>
                                    <TableHead className="text-center w-[80px]">Mar</TableHead>
                                    <TableHead className="text-center w-[80px]">Apr</TableHead>
                                    <TableHead className="text-center w-[80px]">May</TableHead>
                                    <TableHead className="text-center w-[80px]">Jun</TableHead>
                                    <TableHead className="text-center w-[80px]">Jul</TableHead>
                                    <TableHead className="text-center w-[80px]">Aug</TableHead>
                                    <TableHead className="text-center w-[80px]">Sep</TableHead>
                                    <TableHead className="text-center w-[80px]">Oct</TableHead>
                                    <TableHead className="text-center w-[80px]">Nov</TableHead>
                                    <TableHead className="text-center w-[80px]">Dec</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={14} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Loading data...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={14} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <AlertCircle className="h-8 w-8 text-slate-300" />
                                                <p>No penalties found. Click "Calculate Penalties" to generate.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="font-medium text-slate-700 align-top pt-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{record.employee_id}</TableCell>
                                            <TableCell className="align-top pt-4">
                                                <div className="space-y-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${record.penalty_type === 'A' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                                                        }`}>
                                                        Penalty {record.penalty_type}
                                                    </span>
                                                    <div
                                                        className="text-sm text-slate-600 leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: record.reason }}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.jan_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.feb_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.mar_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.apr_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.may_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.jun_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.jul_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.aug_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.sep_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.oct_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.nov_amount)}</TableCell>
                                            <TableCell className="text-center text-xs pt-4">{formatCurrency(record.dec_amount)}</TableCell>
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
