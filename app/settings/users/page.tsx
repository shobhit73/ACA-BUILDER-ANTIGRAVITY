"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Search, UserPlus, Mail, Send, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface User {
    employee_id: string
    first_name: string
    last_name: string
    email: string | null
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
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [appliedSearch, setAppliedSearch] = useState("")
    const [invitingEmail, setInvitingEmail] = useState<string | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearch(searchQuery)
            setPage(1) // Reset to page 1 on search
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const { data: response, isLoading } = useSWR<UserResponse>(
        `/api/settings/users?page=${page}&pageSize=20&search=${appliedSearch}`,
        fetcher,
        {
            keepPreviousData: true,
        }
    )

    const users = response?.data || []
    const pagination = response?.pagination

    const handleInvite = async (email: string) => {
        if (!email) return
        setInvitingEmail(email)
        try {
            const response = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to invite user")
            }

            toast.success(`Invitation sent to ${email}`)
        } catch (error: any) {
            console.error("Error inviting user:", error)
            toast.error(error.message || "Failed to send invitation")
        } finally {
            setInvitingEmail(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Manage Users</h2>
                    <p className="text-sm text-slate-500">View and manage system users (Employees)</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium text-slate-900">User List</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search users..."
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
                                    <TableHead className="w-[150px] font-semibold text-slate-700 sticky left-0 z-30 bg-slate-50 border-r border-slate-200">Employee ID</TableHead>
                                    <TableHead className="font-semibold text-slate-700">First Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Last Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Email Address</TableHead>
                                    <TableHead className="w-[100px] font-semibold text-slate-700">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading users...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
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
                                                        <DropdownMenuItem
                                                            onClick={() => user.email && handleInvite(user.email)}
                                                            disabled={!user.email || invitingEmail === user.email}
                                                        >
                                                            {invitingEmail === user.email ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Send className="mr-2 h-4 w-4" />
                                                            )}
                                                            Send Registration Link
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
