"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building, Mail, Lock, AlertCircle, CheckCircle, Shield } from "lucide-react"
import AdminLayout from "@/components/admin-layout"

export default function AdminCompaniesPage() {
    const [companyName, setCompanyName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [modules, setModules] = useState({
        aca: true,
        pdf: true,
        penalty_dashboard: true,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    function handleModuleChange(moduleName: keyof typeof modules) {
        setModules(prev => ({
            ...prev,
            [moduleName]: !prev[moduleName]
        }))
    }

    async function handleAddCompany(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setLoading(true)

        try {
            const res = await fetch("/api/admin/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    email,
                    password,
                    modules
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess(`Company "${companyName}" added successfully!`)
                setCompanyName("")
                setEmail("")
                setPassword("")
                setModules({ aca: true, pdf: true, penalty_dashboard: true })
            } else {
                setError(data.error || "Failed to add company")
            }
        } catch (err) {
            console.error("Error adding company:", err)
            setError("An error occurred while adding the company")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Building className="h-8 w-8" />
                        Company Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Add new companies and assign modules
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Add New Company</CardTitle>
                        <CardDescription>
                            Create a new company account with admin access and module permissions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCompany} className="space-y-6">
                            {/* Company Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground">Company Information</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="companyName">
                                        <Building className="inline h-4 w-4 mr-1" />
                                        Company Name
                                    </Label>
                                    <Input
                                        id="companyName"
                                        type="text"
                                        placeholder="e.g., Acme Corporation"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        <Mail className="inline h-4 w-4 mr-1" />
                                        Admin Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">
                                        <Lock className="inline h-4 w-4 mr-1" />
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Create a secure password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 6 characters
                                    </p>
                                </div>
                            </div>

                            {/* Module Assignment Section */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Module Access
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Select which modules this company can access
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="aca"
                                            checked={modules.aca}
                                            onCheckedChange={() => handleModuleChange('aca')}
                                            disabled={loading}
                                        />
                                        <Label
                                            htmlFor="aca"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            ACA Module (1095-C Forms)
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="pdf"
                                            checked={modules.pdf}
                                            onCheckedChange={() => handleModuleChange('pdf')}
                                            disabled={loading}
                                        />
                                        <Label
                                            htmlFor="pdf"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            PDF Generation
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="penalty_dashboard"
                                            checked={modules.penalty_dashboard}
                                            onCheckedChange={() => handleModuleChange('penalty_dashboard')}
                                            disabled={loading}
                                        />
                                        <Label
                                            htmlFor="penalty_dashboard"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            Penalty Dashboard
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-green-500 text-green-700">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>{success}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                                size="lg"
                            >
                                {loading ? "Adding Company..." : "Add Company"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
