"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { Loader2, Search, UserPlus, Mail, Send, MoreHorizontal, ChevronLeft, ChevronRight, User, Lock, Check, MapPin, Users, ShieldCheck, UserCheck, XCircle, CheckCircle2, Minus } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { updateUserProfile } from "@/app/actions/user-actions"
import { CompanySelector } from "@/components/company-selector"

interface User {
    employee_id: string
    first_name: string
    last_name: string
    email: string | null
    ee_active: boolean
    er_active: boolean
}

interface UserResponse {
    data: User[]
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ManageUsersPage() {
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isLoadingRole, setIsLoadingRole] = useState(true)

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                let role = "User"
                if (user.user_metadata.role === "super_admin" || user.user_metadata.role === "system_admin") {
                    role = "System Admin"
                } else if (user.user_metadata.role === "company_admin" || user.user_metadata.role === "employer_admin") {
                    role = "Employer Admin"
                }
                setUserRole(role)
            }
            setIsLoadingRole(false)
        }
        fetchRole()
    }, [])

    if (isLoadingRole) {
        return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
    }

    if (userRole === "User") {
        return <UserProfileForm />
    }

    return <AdminUserList userRole={userRole} />
}

function UserProfileForm() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "" })

    // Fetch user details
    useEffect(() => {
        const fetchDetails = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email) {
                // Try to split name from metadata if available, or fetch from census
                // But census is the source of truth for display
                const { data } = await supabase
                    .from("employee_census")
                    .select("first_name, last_name")
                    .eq("email", user.email)
                    .single()

                setProfile({
                    firstName: data?.first_name || user.user_metadata.first_name || "",
                    lastName: data?.last_name || user.user_metadata.last_name || "",
                    email: user.email
                })
            }
            setLoading(false)
        }
        fetchDetails()
    }, [])

    async function handleSubmit(formData: FormData) {
        const result = await updateUserProfile(null, formData)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.message)
            // Ideally we'd update client state locally too if needed
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-xl font-medium text-slate-900">My Profile</h2>
                <p className="text-sm text-slate-500">Manage your account settings and password.</p>
            </div>

            <form action={handleSubmit}>
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            Personal Details
                        </CardTitle>
                        <CardDescription>Update your display name</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" name="firstName" defaultValue={profile.firstName} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" name="lastName" defaultValue={profile.lastName} required />
                            </div>
                        </div>
                        <div className="space-y-2 opacity-60">
                            <Label>Email Address</Label>
                            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-500 text-sm">
                                <Mail className="h-4 w-4" />
                                {profile.email}
                            </div>
                            <p className="text-[10px] text-slate-400">Email cannot be changed. Contact admin for assistance.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white mt-6">
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Lock className="h-4 w-4 text-blue-600" />
                            Change Password
                        </CardTitle>
                        <CardDescription>Leave blank to keep current password</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input id="password" name="password" type="password" placeholder="Min. 6 characters" minLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter new password" minLength={6} />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
                        <SubmitButton />
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}

function SubmitButton() {
    const { pending } = require("react-dom").useFormStatus()
    return (
        <Button disabled={pending} type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {pending ? "Saving..." : "Save Changes"}
        </Button>
    )
}

function AdminUserList({ userRole }: { userRole: string | null }) {
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [appliedSearch, setAppliedSearch] = useState("")
    const [companyCode, setCompanyCode] = useState("")
    const [invitingState, setInvitingState] = useState<{ email: string, role: string } | null>(null)
    const [userCompany, setUserCompany] = useState<string | null>(null)

    useEffect(() => {
        if (userRole === "Employer Admin") {
            const fetchCompany = async () => {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase.from("user_company_mapping").select("company_code").eq("user_id", user.id).single()
                    if (data) {
                        setCompanyCode(data.company_code)
                        setUserCompany(data.company_code)
                    }
                }
            }
            fetchCompany()
        }
    }, [userRole])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearch(searchQuery)
            setPage(1) // Reset to page 1 on search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const { data: response, isLoading, mutate } = useSWR<UserResponse>(
        `/api/settings/users?page=${page}&pageSize=20&search=${appliedSearch}&companyCode=${companyCode}`,
        fetcher,
        {
            keepPreviousData: true,
        }
    )

    const users = response?.data || []
    const pagination = response?.pagination

    const handleInvite = async (email: string, role: "employee" | "system_admin") => {
        if (!email) return
        setInvitingState({ email, role })
        try {
            const response = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to invite user")
            }

            toast.success(`Invitation sent to ${role === 'system_admin' ? 'Employer' : 'Employee'}`)
            // Mutate to reflect any status changes (e.g. if we manually update logic in backend)
            mutate()
        } catch (error: any) {
            console.error("Error inviting user:", error)
            toast.error(error.message || "Failed to send invitation")
        } finally {
            setInvitingState(null)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Manage Users</h2>
                    <p className="text-sm text-slate-500">View and manage system users (Employees)</p>
                </div>
            </div>

            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="text-base font-medium text-slate-900">User List</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {userRole === "System Admin" && (
                                <CompanySelector
                                    value={companyCode}
                                    onChange={(val) => {
                                        setCompanyCode(val)
                                        setPage(1)
                                    }}
                                    className="w-full sm:w-[250px]"
                                />
                            )}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9 border-slate-200 focus-visible:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-auto max-h-[calc(100vh-250px)] relative">
                        <table className="w-full text-sm caption-bottom border-separate border-spacing-0">
                            <TableHeader className="bg-slate-50 sticky top-0 z-20">
                                <TableRow>
                                    <TableHead className="w-[150px] font-semibold text-slate-700 sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Employee ID</TableHead>
                                    <TableHead className="font-semibold text-slate-700">First Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Last Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Email Address</TableHead>
                                    <TableHead className="text-center font-semibold text-slate-700 w-[100px]">Active</TableHead>
                                    <TableHead className="w-[80px] font-semibold text-slate-700">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading users...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            No users found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.employee_id} className="hover:bg-slate-50/50 group">
                                            <TableCell className="font-medium text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100">{user.employee_id}</TableCell>
                                            <TableCell className="text-slate-700">{user.first_name}</TableCell>
                                            <TableCell className="text-slate-700">{user.last_name}</TableCell>
                                            <TableCell className="text-slate-600">
                                                {user.email ? (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3 w-3 text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No email</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {user.ee_active ? (
                                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">
                                                        <Check className="h-3.5 w-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300">
                                                        <Minus className="h-3.5 w-3.5" />
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
                                                        <DropdownMenuLabel>Invitations</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => user.email && handleInvite(user.email!, "employee")}
                                                            disabled={!user.email || invitingState?.email === user.email}
                                                        >
                                                            {invitingState?.email === user.email && invitingState.role === "employee" ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <UserCheck className="mr-2 h-4 w-4" />
                                                            )}
                                                            Send Employee Invite
                                                        </DropdownMenuItem>
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
        </div>
    )
}
