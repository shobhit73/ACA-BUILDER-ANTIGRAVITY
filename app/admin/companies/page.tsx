"use client"

import { useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Building, Plus, Pencil, Loader2, Search, Settings2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface Company {
    company_code: string
    company_name: string
    ein?: string
    city?: string
    contact_name?: string
    contact_email?: string
}

const fetcher = async (url: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("company_details").select("*").order("company_name")
    if (error) throw error
    return data as Company[]
}

export default function CompaniesPage() {
    const { data: companies, mutate, isLoading } = useSWR("/api/companies", fetcher)
    const [search, setSearch] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [editingCompany, setEditingCompany] = useState<Company | null>(null)

    const filteredCompanies = companies?.filter(c =>
        c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        c.company_code.toLowerCase().includes(search.toLowerCase())
    )

    const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
    const [selectedCompanyModules, setSelectedCompanyModules] = useState<Company | null>(null)

    const handleOpen = (company?: Company) => {
        setEditingCompany(company || null)
        setIsOpen(true)
    }

    const handleManageModules = (company: Company) => {
        setSelectedCompanyModules(company)
        setModuleDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Company Management</h2>
                    <p className="text-slate-500">Add and manage client companies.</p>
                </div>
                <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Company
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-medium">Companies Directory</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search companies..."
                            className="pl-8 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>EIN</TableHead>
                                    <TableHead>Contact Person</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCompanies?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            No companies found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCompanies?.map((company) => (
                                        <TableRow key={company.company_code} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium">{company.company_code}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {company.company_name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {company.company_name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500">{company.ein || "-"}</TableCell>
                                            <TableCell>
                                                {company.contact_name ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-700">{company.contact_name}</span>
                                                        <span className="text-xs text-slate-400">{company.contact_email}</span>
                                                    </div>
                                                ) : <span className="text-slate-400 italic">None</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleManageModules(company)}>
                                                        <Settings2 className="h-3.5 w-3.5 mr-1" /> Modules
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpen(company)}>
                                                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <CompanyDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                company={editingCompany}
                onSuccess={() => {
                    mutate()
                    setIsOpen(false)
                }}
            />

            {selectedCompanyModules && (
                <ModulesDialog
                    open={moduleDialogOpen}
                    onOpenChange={setModuleDialogOpen}
                    company={selectedCompanyModules}
                />
            )}
        </div>
    )
}

function ModulesDialog({ open, onOpenChange, company }: { open: boolean, onOpenChange: (open: boolean) => void, company: Company }) {
    const supabase = createClient()
    const { data: activeModules, mutate: mutateModules, isLoading } = useSWR(
        open ? `/api/company/modules/${company.company_code}` : null,
        async () => {
            const { data } = await supabase
                .from("company_modules")
                .select("module_code, is_enabled")
                .eq("company_code", company.company_code)
            return data || []
        }
    )

    const availableModules = [
        { code: "import_data", label: "Import Data", description: "Allow uploading census/payroll files" },
        { code: "view_data", label: "View Data", description: "Access to data viewer tables" },
        { code: "generate_reports", label: "Generate Reports", description: "Create monthly status reports" },
        { code: "aca_report", label: "ACA Report", description: "Final ACA reporting dashboard" },
        { code: "pdf_1095c", label: "1095-C PDFs", description: "Generate and download 1095-C forms" },
        { code: "pdf_1094c", label: "1094-C Form", description: "Generate 1094-C transmittal" },
        { code: "plan_configuration", label: "Plan Config", description: "Configure health plans" },
        { code: "aca_penalties", label: "Penalty Analysis", description: "View penalty risks" },
    ]

    const toggleModule = async (moduleCode: string, currentState: boolean) => {
        try {
            // Optimistic update could go here
            await supabase.rpc("upsert_company_module", {
                p_company_code: company.company_code,
                p_module_code: moduleCode,
                p_is_enabled: !currentState
            })
            mutateModules()
            toast.success(`Module ${!currentState ? 'enabled' : 'disabled'}`)
        } catch (error: any) {
            toast.error("Failed to update module")
            console.error(error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Modules</DialogTitle>
                    <DialogDescription>
                        Enable or disable features for <span className="font-medium text-slate-900">{company.company_name}</span>.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                ) : (
                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
                        {availableModules.map((module) => {
                            const isEnabled = activeModules?.find((m: any) => m.module_code === module.code)?.is_enabled ?? false
                            return (
                                <div key={module.code} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                    <div className="space-y-0.5">
                                        <Label htmlFor={module.code} className="text-sm font-medium">{module.label}</Label>
                                        <p className="text-xs text-slate-500">{module.description}</p>
                                    </div>
                                    <Switch
                                        id={module.code}
                                        checked={isEnabled}
                                        onCheckedChange={() => toggleModule(module.code, isEnabled)}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function CompanyDialog({ open, onOpenChange, company, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, company: Company | null, onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())

        try {
            const supabase = createClient()

            // Using the stored procedure upsert_company_details
            // Note: Typescript might complain if RPC types aren't perfect in database.types.ts yet, casting to any for safety or ensure types exist
            const { error: rpcError } = await supabase.rpc("upsert_company_details", {
                p_company_code: data.company_code as string,
                p_company_name: data.company_name as string,
                p_ein: data.ein as string || null,
                p_contact_name: data.contact_name as string || null,
                p_contact_email: data.contact_email as string || null,
                p_city: data.city as string || null,
                p_address_line_1: null,
                p_state: null,
                p_zip_code: null
            })

            if (rpcError) throw rpcError

            toast.success(company ? "Company updated successfully" : "Company created successfully")
            onSuccess()
        } catch (error: any) {
            console.error("Error saving company:", error)
            toast.error(error.message || "Failed to save company")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{company ? "Edit Company" : "Add New Company"}</DialogTitle>
                    <DialogDescription>
                        {company ? "Update company details." : "Create a new organization in the system."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input id="company_name" name="company_name" defaultValue={company?.company_name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_code">Company Code</Label>
                            <Input
                                id="company_code"
                                name="company_code"
                                defaultValue={company?.company_code}
                                required
                                disabled={!!company} // Disable PK editing
                                placeholder="e.g. ACME_CORP"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ein">EIN</Label>
                            <Input id="ein" name="ein" defaultValue={company?.ein} placeholder="XX-XXXXXXX" />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <h4 className="text-sm font-medium text-slate-500 mb-2">Primary Contact</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_name">Name</Label>
                                    <Input id="contact_name" name="contact_name" defaultValue={company?.contact_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">Email</Label>
                                    <Input id="contact_email" name="contact_email" type="email" defaultValue={company?.contact_email} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Company
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
