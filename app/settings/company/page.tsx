"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Search, Building2, ChevronLeft, ChevronRight, MoreHorizontal, Ban, Share2, CheckCircle2, XCircle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { toggleCompanyStatus } from "@/app/actions/company-actions"

interface Company {
    company_code: string
    company_name: string
    is_active: boolean
}

interface CompanyResponse {
    data: Company[]
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ManageCompanyPage() {
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [appliedSearch, setAppliedSearch] = useState("")
    const [actionCompany, setActionCompany] = useState<Company | null>(null)
    const [isAlertOpen, setIsAlertOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearch(searchQuery)
            setPage(1) // Reset to page 1 on search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const { data: response, isLoading, mutate } = useSWR<CompanyResponse>(
        `/api/settings/company?page=${page}&pageSize=20&search=${appliedSearch}`,
        fetcher,
        {
            keepPreviousData: true,
        }
    )

    const companies = response?.data || []
    const pagination = response?.pagination

    const handleGenerateInvite = (company: Company) => {
        toast.success(`Invitation sent to admin of ${company.company_name}`)
    }

    const openDisableDialog = (company: Company) => {
        setActionCompany(company)
        setIsAlertOpen(true)
    }

    const handleConfirmDisable = async () => {
        if (!actionCompany) return

        setIsUpdating(true)
        const newStatus = !actionCompany.is_active

        // If we are enabling, checking !is_active (which is false) -> true
        // If we are disabling, checking is_active (true) -> false

        const result = await toggleCompanyStatus(actionCompany.company_code, newStatus)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(newStatus ? "Company access enabled" : "Company access disabled")
            mutate() // Refresh list
        }

        setIsUpdating(false)
        setIsAlertOpen(false)
        setActionCompany(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Manage Company</h2>
                    <p className="text-sm text-slate-500">Configure company details and preferences</p>
                </div>
            </div>

            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium text-slate-900">Company List</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 border-slate-200 focus-visible:ring-blue-500"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-auto max-h-[calc(100vh-250px)] relative">
                        <table className="w-full text-sm caption-bottom border-separate border-spacing-0">
                            <TableHeader className="bg-slate-50 sticky top-0 z-20">
                                <TableRow>
                                    <TableHead className="w-[150px] font-semibold text-slate-700 sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Company Code</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Company Name</TableHead>
                                    <TableHead className="w-[100px] text-center font-semibold text-slate-700">Status</TableHead>
                                    <TableHead className="w-[80px] font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading companies...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : companies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                            No companies found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    companies.map((company) => (
                                        <TableRow key={company.company_code} className="hover:bg-slate-50/50 group">
                                            <TableCell className="font-medium text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{company.company_code}</TableCell>
                                            <TableCell className="text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    {company.company_name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {company.is_active !== false ? (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        Active
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        Disabled
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <Link href={`/admin/companies/${company.company_code}/edit`}>
                                                            <DropdownMenuItem>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Manage
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuItem onClick={() => handleGenerateInvite(company)}>
                                                            <Share2 className="mr-2 h-4 w-4" />
                                                            Send Invite
                                                        </DropdownMenuItem>
                                                        {company.is_active !== false ? (
                                                            <DropdownMenuItem
                                                                onClick={() => openDisableDialog(company)}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <Ban className="mr-2 h-4 w-4" />
                                                                Disable Employer
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => openDisableDialog(company)}
                                                                className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                            >
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                Enable Employer
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100">
                            <div className="text-sm text-slate-500">
                                Showing {((page - 1) * pagination.pageSize) + 1} to {Math.min(page * pagination.pageSize, pagination.total)} of {pagination.total} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionCompany?.is_active !== false ? "Disable Employer Access?" : "Enable Employer Access?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionCompany?.is_active !== false
                                ? "Warning: Upon disabling the employer, the employer admins and employees will not be able to access their portals. Their data will remain in the system, but their access will be blocked."
                                : "This will restore portal access for all employer admins and employees."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault() // handle async
                                handleConfirmDisable()
                            }}
                            className={actionCompany?.is_active !== false ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                            disabled={isUpdating}
                        >
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionCompany?.is_active !== false ? "Proceed & Disable" : "Proceed & Enable"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
