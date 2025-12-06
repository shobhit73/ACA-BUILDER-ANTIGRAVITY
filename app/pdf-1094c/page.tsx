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
import {
    Loader2,
    FileText,
    Download,
    Building2,
    CheckCircle2,
    Info,
    Calendar,
    ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"

export default function PDF1094CPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [companies, setCompanies] = useState<{ company_code: string; company_name: string }[]>([])
    const [companyCode, setCompanyCode] = useState("")
    const [taxYear, setTaxYear] = useState("2025")
    const [isGenerating, setIsGenerating] = useState(false)

    // Monthly stats state
    const [monthlyStats, setMonthlyStats] = useState<any[]>([])

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

            if (role === "System Admin") {
                const { data } = await supabase.from("company_details").select("company_code, company_name")
                if (data && data.length > 0) {
                    setCompanies(data)
                    setCompanyCode(data[0].company_code)
                }
            } else {
                // If regular user, get their company
                const { data: mapping } = await supabase
                    .from("user_company_mapping")
                    .select("company_code")
                    .eq("user_id", user.id)
                    .single()

                if (mapping) {
                    setCompanyCode(mapping.company_code)
                }
            }
        }
    }

    // Fetch stats primarily for preview
    useEffect(() => {
        if (companyCode) {
            fetchMonthlyStats()
        }
    }, [companyCode, taxYear])

    const fetchMonthlyStats = async () => {
        setIsLoading(true)
        const supabase = createClient()

        // This is a simplified preview. The real heavy lifting is in the PDF generation API.
        // We will just fetch the counts from aca_final_report to show "something"
        // In a real app we might want a dedicated RPC for this preview.
        // For now, let's just mock the 12 months structure or fetch if we have an endpoint.

        // Let's create a placeholder 12-month array
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const stats = months.map((m, i) => ({
            month: m,
            mecOffered: true, // Default assumption
            fullTimeCount: 0,
            totalCount: 0,
            aggGroup: false
        }))

        setMonthlyStats(stats)
        setIsLoading(false)

        // TODO: In future enhancement, fetch actual live counts here to display in the table
    }

    const handleGeneratePDF = async () => {
        setIsGenerating(true)
        try {
            const url = `/api/pdf-1094c?companyCode=${companyCode}&taxYear=${taxYear}`
            const response = await fetch(url)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to generate PDF")
            }

            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = blobUrl
            a.download = `1094C_${companyCode}_${taxYear}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(blobUrl)

            toast.success("1094-C PDF generated successfully!")
        } catch (error: any) {
            console.error("Download error:", error)
            toast.error(`Failed to generate 1094-C: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        1094-C Transmittal Generator
                    </h1>
                    <p className="text-muted-foreground mt-1">Generate IRS Form 1094-C (Transmittal of Employer-Provided Health Insurance Offer and Coverage)</p>
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

            <Alert className="border-blue-200 bg-blue-50/50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                    <strong>Note:</strong> This tool aggregates data from your company profile and employee records to generate the 1094-C.
                    Ensure your <strong>Company Details</strong> (Part I) and <strong>Certifications</strong> (Part II) are correct in Settings before generating.
                </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Generation Card */}
                <Card className="md:col-span-1 border-slate-200 shadow-md">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Generate Form
                        </CardTitle>
                        <CardDescription>Create the official PDF</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Company:</span>
                                <span className="font-medium">{companyCode}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Tax Year:</span>
                                <span className="font-medium">{taxYear}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Status:</span>
                                <span className="text-green-600 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            size="lg"
                            onClick={handleGeneratePDF}
                            disabled={isGenerating || !companyCode}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download 1094-C PDF
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-slate-400">
                            Generates standard IRS format PDF
                        </p>
                    </CardContent>
                </Card>

                {/* Preview / Instructions Card */}
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Part III - Ale Member Information - Monthly</CardTitle>
                        <CardDescription>
                            Preview of the monthly breakdown data that will be included in the report.
                            Actual values are calculated at generation time based on your stored reports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-[100px]">Month</TableHead>
                                        <TableHead className="text-center">(a) MEC Offer</TableHead>
                                        <TableHead className="text-center">(b) Full-Time Employees</TableHead>
                                        <TableHead className="text-center">(c) Total Employees</TableHead>
                                        <TableHead className="text-center">(d) Aggregated Group</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthlyStats.map((stat) => (
                                        <TableRow key={stat.month}>
                                            <TableCell className="font-medium">{stat.month}</TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox checked={stat.mecOffered} disabled />
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                <span className="text-slate-400 italic">Calc in PDF</span>
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                <span className="text-slate-400 italic">Calc in PDF</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox checked={stat.aggGroup} disabled />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
