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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
    Loader2,
    FileText,
    Download,
    Users,
    CheckCircle2,
    Info,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Employee {
    employee_id: string
    first_name: string
    last_name: string
    ssn: string
}

const ITEMS_PER_PAGE = 20

export default function PDF1095CPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])
    const [companyCode, setCompanyCode] = useState("")
    const [taxYear, setTaxYear] = useState("2025")
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)

    const [user, setUser] = useState<{ role: string; email: string } | null>(null)

    useEffect(() => {
        fetchUserAndCompanies()
    }, [])

    const fetchUserAndCompanies = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const role = user.user_metadata.role === "super_admin" ? "System Admin" : "User"
            setUser({ role, email: user.email || "" })

            // Only fetch companies if admin
            if (role === "System Admin") {
                const { data } = await supabase.from("company_details").select("company_code, company_name")
                if (data && data.length > 0) {
                    setCompanies(data)
                    setCompanyCode(data[0].company_code)
                }
            } else {
                // For regular user, we might need to fetch their company code from census or just default
                // For now, let's assume we can find them by email across all companies or just fetch their record
                // We'll handle this in fetchEmployees
            }
        }
    }

    useEffect(() => {
        if (user) {
            fetchEmployees()
        }
    }, [user, companyCode, taxYear])

    const fetchEmployees = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const supabase = createClient()
            let query = supabase
                .from("employee_census")
                .select("employee_id, first_name, last_name, ssn, company_code")

            if (user.role === "System Admin") {
                if (companyCode) {
                    query = query.eq("company_code", companyCode)
                }
                query = query.order("employee_id", { ascending: true })
            } else {
                // Regular user: only see own record
                query = query.eq("email", user.email)
            }

            const { data, error } = await query

            if (data) {
                setEmployees(data)
                // If regular user, set company code from their record for PDF generation
                if (user.role !== "System Admin" && data.length > 0) {
                    setCompanyCode(data[0].company_code)
                }
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error)
            toast.error("Failed to load employees")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const filteredEmployees = employees.filter((emp) =>
        emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.ssn.includes(searchQuery)
    )

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE)
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const handleDownloadPDF = async (employeeId: string) => {
        setDownloadingIds((prev) => new Set([...prev, employeeId]))
        try {
            const url = `/api/pdf-1095c?companyCode=${companyCode}&taxYear=${taxYear}&employeeId=${employeeId}`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error("Failed to generate PDF")
            }

            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = blobUrl
            a.download = `1095C_${employeeId}_${taxYear}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(blobUrl)

            toast.success("PDF downloaded successfully!")
        } catch (error) {
            console.error("Download error:", error)
            toast.error("Failed to download PDF")
        } finally {
            setDownloadingIds((prev) => {
                const newSet = new Set(prev)
                newSet.delete(employeeId)
                return newSet
            })
        }
    }

    const maskSSN = (ssn: string) => {
        if (!ssn) return "***-**-****"
        return `***-**-${ssn.slice(-4)}`
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        1095-C PDF Generator
                    </h1>
                    <p className="text-muted-foreground mt-1">Generate IRS Form 1095-C for employees</p>
                </div>

                <div className="flex items-center gap-3">
                    {user?.role === "System Admin" && (
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
                    )}

                    <Select value={taxYear} onValueChange={setTaxYear}>
                        <SelectTrigger className="w-[120px] bg-white">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-600">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-bold text-slate-900">{employees.length}</div>
                        <p className="text-[10px] text-slate-500">Ready for PDF generation</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-600">Status</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-bold text-slate-900">Ready</div>
                        <p className="text-[10px] text-slate-500">All systems operational</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-600">Form</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-bold text-slate-900">1095-C</div>
                        <p className="text-[10px] text-slate-500">IRS {taxYear}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Instructions */}
            <Alert className="border-blue-200 bg-blue-50/50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                    <strong>Instructions:</strong> Select a company and tax year above. Click the "Download PDF" button for each
                    employee to generate their completed Form 1095-C. The form includes all Parts (I, II, and III).
                </AlertDescription>
            </Alert>

            {/* Employee Table */}
            <Card className="border-slate-200 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-slate-800">Employee Master List</CardTitle>
                        <CardDescription>
                            List of employees from census. Dependents are included in the generated PDF.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-auto max-h-[calc(100vh-280px)] relative">
                        <table className="w-full text-sm caption-bottom border-separate border-spacing-0">
                            <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[100px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Emp ID</TableHead>
                                    <TableHead className="w-[200px] sticky left-[100px] z-30 bg-slate-50 border-r border-slate-200">Last Name</TableHead>
                                    <TableHead className="w-[200px]">First Name</TableHead>
                                    <TableHead className="w-[150px]">SSN</TableHead>
                                    <TableHead className="text-center w-[150px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Loading employees...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No employees found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedEmployees.map((emp) => (
                                        <TableRow key={emp.employee_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="font-medium text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{emp.employee_id}</TableCell>
                                            <TableCell className="sticky left-[100px] z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{emp.last_name}</TableCell>
                                            <TableCell>{emp.first_name}</TableCell>
                                            <TableCell className="font-mono text-sm">{maskSSN(emp.ssn)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleDownloadPDF(emp.employee_id)}
                                                    disabled={downloadingIds.has(emp.employee_id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                >
                                                    {downloadingIds.has(emp.employee_id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Download className="h-4 w-4 mr-1" /> PDF
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredEmployees.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-slate-50/30">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                                <span className="font-medium">
                                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)}
                                </span>{" "}
                                of <span className="font-medium">{filteredEmployees.length}</span> results
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
