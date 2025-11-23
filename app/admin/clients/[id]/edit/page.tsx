"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Building, AlertCircle, CheckCircle } from "lucide-react"

export default function EditClientPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const [companyName, setCompanyName] = useState("")
    const [modules, setModules] = useState({
        aca: false,
        pdf: false,
        penalty_dashboard: false,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Fetch client details
    useEffect(() => {
        async function fetchCompany() {
            try {
                const res = await fetch(`/api/admin/clients`)
                const data = await res.json()
                if (res.ok) {
                    const found = data.companies?.find((c: any) => c.id === id)
                    if (found) {
                        setCompanyName(found.name)
                        // Map existing modules to state
                        const moduleState = {
                            aca: found.modules.some((m: any) => m.module_name === 'aca' && m.is_enabled),
                            pdf: found.modules.some((m: any) => m.module_name === 'pdf' && m.is_enabled),
                            penalty_dashboard: found.modules.some((m: any) => m.module_name === 'penalty_dashboard' && m.is_enabled),
                        }
                        setModules(moduleState)
                    } else {
                        setError("Company not found")
                    }
                } else {
                    setError(data.error || "Failed to fetch company")
                }
            } catch (e) {
                setError("Error loading company")
            } finally {
                setLoading(false)
            }
        }
        fetchCompany()
    }, [id])

    function handleModuleChange(moduleName: keyof typeof modules) {
        setModules(prev => ({
            ...prev,
            [moduleName]: !prev[moduleName]
        }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`/api/admin/clients/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    modules
                })
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess("Company details updated successfully!")
            } else {
                setError(data.error || "Failed to update company")
            }
        } catch (err) {
            console.error("Error updating company:", err)
            setError("An error occurred while saving")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="container mx-auto py-8 px-4 max-w-2xl flex justify-center">
                    <p className="text-muted-foreground">Loading company details...</p>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Company</CardTitle>
                        <CardDescription>Update company name and module access</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-4">
                                <Label htmlFor="companyName">
                                    <Building className="inline h-4 w-4 mr-1" />
                                    Company Name
                                </Label>
                                <Input
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                />
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
                                        />
                                        <Label htmlFor="aca" className="cursor-pointer">
                                            ACA Module (1095-C Forms)
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="pdf"
                                            checked={modules.pdf}
                                            onCheckedChange={() => handleModuleChange('pdf')}
                                        />
                                        <Label htmlFor="pdf" className="cursor-pointer">
                                            PDF Generation
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="penalty_dashboard"
                                            checked={modules.penalty_dashboard}
                                            onCheckedChange={() => handleModuleChange('penalty_dashboard')}
                                        />
                                        <Label htmlFor="penalty_dashboard" className="cursor-pointer">
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

                            <div className="flex gap-4">
                                <Button type="submit" className="flex-1" size="lg" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => router.push("/admin/clients")}
                                    className="flex-1"
                                    size="lg"
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
