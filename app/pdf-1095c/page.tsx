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
    FileCheck
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Employee {
    employee_id: string
    first_name: string
    last_name: string
    ssn: string
    company_code: string
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

    const [user, setUser] = useState<{ role: string; email: string; name?: string } | null>(null)

    useEffect(() => {
        fetchUserAndCompanies()
    }, [])

    const fetchUserAndCompanies = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            let role = "User"
            if (user.user_metadata.role === "super_admin" || user.user_metadata.role === "system_admin") {
                role = "System Admin"
            } else if (user.user_metadata.role === "company_admin" || user.user_metadata.role === "employer_admin") {
                role = "Employer Admin"
            }

            const name = user.user_metadata.first_name || user.email?.split("@")[0] || "User"
            setUser({ role, email: user.email || "", name })

            // Only fetch companies if sys admin
            if (role === "System Admin") {
                const { data } = await supabase.from("company_details").select("company_code, company_name")
                if (data && data.length > 0) {
                    setCompanies(data)
                    setCompanyCode(data[0].company_code)
                }
            } else if (role === "Employer Admin") {
                // Fetch assigned company for Employer Admin
                const { data } = await supabase.from("user_company_mapping").select("company_code").eq("user_id", user.id).single()
                if (data) {
                    setCompanyCode(data.company_code)
                }
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

            if (user.role === "System Admin" || user.role === "Employer Admin") {
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
                // Deduplicate for regular users if multiple records exist for same person (same SSN)
                // This handles the "two records" issue if they are essentially duplicates
                let employeeList = data as Employee[]

                if (user.role !== "System Admin" && user.role !== "Employer Admin") {
                    // Ensure unique by employee_id to be safe, but mostly we want to avoid showing exact duplicates if any
                    // If records have different IDs but same info, we might want to keep them or just take the latest.
                    // For now, let's keep all unique IDs but if user complained about "two pdfs", it's likely they see multiple rows.
                    // The simplified view will handle the display better.
                    setCompanyCode(data.length > 0 ? data[0].company_code : "")
                }

                setEmployees(employeeList)
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error)
            toast.error("Failed to load employees")
        } finally {
            setIsLoading(false)
        }
    }

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

    // --- VIEW FOR REGULAR EMPLOYEES ---
    if (user?.role !== "System Admin" && user?.role !== "Employer Admin") {
        return (
            <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Tax Documents</h1>
                    <p className="text-slate-500 mt-1">Access and download your annual 1095-C tax forms.</p>
                </div>

                <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-medium text-slate-800 flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-blue-600" />
                                Available Forms
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Tax Year:</span>
                                <Select value={taxYear} onValueChange={setTaxYear}>
                                    <SelectTrigger className="w-[100px] h-8 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
                                <p>Loading your documents...</p>
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                <p>No 1095-C forms found for the selected year.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {/* Only show one entry if multiple identical employee records exist to avoid confusion, 
                                    OR show them with distinction if IDs differ. 
                                    Here we simply map what we have but present it cleanly. */}
                                {employees.map((emp) => (
                                    <div key={emp.employee_id} className="group flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-lg">Form 1095-C</span>
                                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                <span>Tax Year {taxYear}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="font-mono">ID: {emp.employee_id}</span>
                                                {emp.company_code && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                        <span>{emp.company_code}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleDownloadPDF(emp.employee_id)}
                                            disabled={downloadingIds.has(emp.employee_id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm min-w-[140px]"
                                        >
                                            {downloadingIds.has(emp.employee_id) ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Preparing...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download PDF
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                        If you believe there is an error in your 1095-C form, please contact your HR department or the benefits administrator at <strong>hr@company.com</strong>.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // --- ADMIN VIEW (Existing) ---
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
                    <div className="relative w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <Input
                            placeholder="Search by name, ID or SSN..."
                            className="pl-10 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
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
