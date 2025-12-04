"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Search, Plus, Building2 } from "lucide-react"
import { toast } from "sonner"

interface Company {
    company_code: string
    company_name: string
}

export default function ManageCompanyPage() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchCompanies()
    }, [])

    const fetchCompanies = async () => {
        try {
            const response = await fetch("/api/settings/company")
            if (!response.ok) throw new Error("Failed to fetch companies")
            const data = await response.json()
            setCompanies(data)
        } catch (error) {
            console.error("Error fetching companies:", error)
            toast.error("Failed to load companies")
        } finally {
            setIsLoading(false)
        }
    }

    const filteredCompanies = companies.filter(company =>
        company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.company_code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Manage Company</h2>
                    <p className="text-sm text-slate-500">Configure company details and preferences</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                </Button>
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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[150px] font-semibold text-slate-700">Company Code</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Company Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">User Email</TableHead>
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
                                ) : filteredCompanies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                            No companies found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <TableRow key={company.company_code} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium text-slate-900">{company.company_code}</TableCell>
                                            <TableCell className="text-slate-700 flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-slate-400" />
                                                {company.company_name}
                                            </TableCell>
                                            <TableCell className="text-slate-500 italic">
                                                {/* Blank for now as requested */}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
