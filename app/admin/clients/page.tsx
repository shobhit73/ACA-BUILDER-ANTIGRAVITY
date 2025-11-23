"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building, Edit, Plus, Shield, FileText, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Company {
    id: string
    name: string
    contact_email: string
    created_at: string
    status: string
    admin_email?: string
    modules?: Array<{ module_name: string; is_enabled: boolean }>
}

export default function ManageClientsPage() {
    const router = useRouter()
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchCompanies()
    }, [])

    async function fetchCompanies() {
        try {
            const res = await fetch("/api/admin/clients")
            const data = await res.json()

            if (res.ok) {
                setCompanies(data.companies || [])
            } else {
                setError(data.error || "Failed to fetch companies")
            }
        } catch (err) {
            setError("An error occurred while fetching companies")
        } finally {
            setLoading(false)
        }
    }

    function getModuleIcon(moduleName: string) {
        switch (moduleName) {
            case 'aca':
                return <Shield className="h-4 w-4" />
            case 'pdf':
                return <FileText className="h-4 w-4" />
            case 'penalty_dashboard':
                return <DollarSign className="h-4 w-4" />
            default:
                return null
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <AdminLayout>
            <div className="p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Clients</h1>
                        <p className="text-gray-500 mt-1">View and manage all client companies</p>
                    </div>
                    <Button
                        onClick={() => router.push('/admin/companies')}
                        className="bg-gradient-to-r from-accent to-primary"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Company
                    </Button>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>All Companies</CardTitle>
                        <CardDescription>
                            {companies.length} {companies.length === 1 ? 'company' : 'companies'} registered
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading companies...</div>
                        ) : companies.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No companies found. Click "Add New Company" to get started.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Admin Email</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Modules</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companies.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-primary" />
                                                    {company.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {company.admin_email || company.contact_email}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {formatDate(company.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={company.status === 'active' ? 'default' : 'secondary'}
                                                    className={company.status === 'active' ? 'bg-green-500' : ''}
                                                >
                                                    {company.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {company.modules && company.modules.length > 0 ? (
                                                        company.modules
                                                            .filter(m => m.is_enabled)
                                                            .map((module) => (
                                                                <div
                                                                    key={module.module_name}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                                                    title={module.module_name}
                                                                >
                                                                    {getModuleIcon(module.module_name)}
                                                                    <span className="capitalize">
                                                                        {module.module_name.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">No modules</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/clients/${company.id}/edit`)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
