"use client"

import { useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Mail, Shield, Trash2, Building } from "lucide-react"
import { toast } from "sonner"

interface AdminUser {
    id: string
    email: string
    role: "system_admin" | "employer_admin"
    first_name: string | null
    last_name: string | null
    assigned_company: string | null // For display
}

interface Company {
    company_code: string
    company_name: string
}

const fetcher = async () => {
    const supabase = createClient()

    // Fetch profiles
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["system_admin", "employer_admin"])
        .order("created_at", { ascending: false })

    if (error) throw error

    // Determine assigned companies for each admin (inefficient but works for small admin lists)
    const adminsWithCompany = await Promise.all(profiles.map(async (p) => {
        let companyName = null
        if (p.role === 'employer_admin') {
            const { data: mapping } = await supabase
                .from("user_company_mapping")
                .select("company_code, company_details(company_name)")
                .eq("user_id", p.id)
                .single()

            if (mapping && mapping.company_details) {
                // @ts-ignore
                companyName = mapping.company_details.company_name
            }
        }
        return { ...p, assigned_company: companyName } as AdminUser
    }))

    return adminsWithCompany
}

export default function AdminUsersPage() {
    const { data: admins, mutate, isLoading } = useSWR("/api/admin/users", fetcher)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Management</h2>
                    <p className="text-slate-500">Manage platform administrators and company users.</p>
                </div>
                <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Invite Admin
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100">
                    <CardTitle className="text-base font-medium">Administrators</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Assigned Company</TableHead>
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
                            ) : admins?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">No admins found.</TableCell>
                                </TableRow>
                            ) : (
                                admins?.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">
                                            {admin.first_name} {admin.last_name || ""}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                {admin.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${admin.role === 'system_admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                <Shield className="h-3 w-3 mr-1" />
                                                {admin.role === 'system_admin' ? 'System Admin' : 'Employer Admin'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {admin.assigned_company ? (
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Building className="h-3.5 w-3.5 text-slate-400" />
                                                    {admin.assigned_company}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Add delete/revoke actions here later */}
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <InviteAdminDialog open={isOpen} onOpenChange={setIsOpen} onSuccess={() => mutate()} />
        </div>
    )
}

function InviteAdminDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const [role, setRole] = useState("employer_admin")
    const { data: companies } = useSWR("/api/companies-list", async () => {
        const supabase = createClient()
        const { data } = await supabase.from("company_details").select("company_code, company_name")
        return data as Company[]
    })

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const companyCode = formData.get("company_code") as string

        try {
            const supabase = createClient()

            // 1. Create Invite Record
            const { error: inviteError } = await supabase
                .from("company_invites")
                .insert({
                    company_code: companyCode || "SYSTEM", // Use dummy for sys admin
                    email: email,
                    role: role === 'system_admin' ? 'super_admin' : 'company_admin', // Match legacy roles or updated ones
                    status: 'pending'
                })

            if (inviteError) throw inviteError

            // 2. Send Invitation Email (via API)
            const response = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role, companyCode }), // Pass extra metadata
            })

            if (!response.ok) throw new Error("Failed to send invite email")

            toast.success("Invitation sent successfully")
            onOpenChange(false)
            onSuccess()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to invite admin")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Administrator</DialogTitle>
                    <DialogDescription>
                        Send an invitation to a new administrator.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input name="email" type="email" required placeholder="colleague@example.com" />
                    </div>

                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={setRole} name="role">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employer_admin">Employer Admin</SelectItem>
                                <SelectItem value="system_admin">System Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {role === 'employer_admin' && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <Label>Assign Company</Label>
                            <Select name="company_code" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies?.map(c => (
                                        <SelectItem key={c.company_code} value={c.company_code}>
                                            {c.company_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
