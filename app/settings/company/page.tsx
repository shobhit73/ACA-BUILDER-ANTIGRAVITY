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
import { Loader2, Search, Plus, Building2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface Company {
    company_code: string
    company_name: string
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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearch(searchQuery)
            setPage(1) // Reset to page 1 on search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const { data: response, isLoading } = useSWR<CompanyResponse>(
        `/api/settings/company?page=${page}&pageSize=20&search=${appliedSearch}`,
        fetcher,
        {
            keepPreviousData: true,
        }
    )

    const companies = response?.data || []
    const pagination = response?.pagination

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Manage Company</h2>
                    <p className="text-sm text-slate-500">Configure company details and preferences</p>
                </div>
                <Link href="/admin/companies/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                    </Button>
                </Link>
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
                                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading companies...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : companies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                            No companies found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    companies.map((company) => (
                                        <TableRow key={company.company_code} className="hover:bg-slate-50/50 group">
                                            <TableCell className="font-medium text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{company.company_code}</TableCell>
                                            <TableCell className="text-slate-700 flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-slate-400" />
                                                {company.company_name}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link href={`/admin/companies/${company.company_code}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button variant="outline" size="sm" onClick={() => toast.success(`Invitation sent to admin of ${company.company_name}`)}>
                                                    Send Invite
                                                </Button>
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
        </div>
    )
}
