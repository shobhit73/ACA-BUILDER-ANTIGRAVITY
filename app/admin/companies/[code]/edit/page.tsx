"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { updateCompany, getCompanyDetails } from "@/app/actions/company-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Company...
                </>
            ) : (
                "Update Company"
            )}
        </Button>
    )
}

export default function EditCompanyPage() {
    const params = useParams()
    const companyCode = params.code as string
    const [isLoading, setIsLoading] = useState(true)
    const [defaultValues, setDefaultValues] = useState<any>(null)

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await getCompanyDetails(companyCode)
                if (data.error) {
                    toast.error(data.error)
                } else {
                    setDefaultValues(data)
                }
            } catch (error) {
                console.error("Error fetching company details:", error)
                toast.error("Failed to load company details")
            } finally {
                setIsLoading(false)
            }
        }
        if (companyCode) {
            fetchDetails()
        }
    }, [companyCode])

    async function handleSubmit(formData: FormData) {
        const result = await updateCompany(companyCode, {}, formData)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.message)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!defaultValues) {
        return (
            <div className="container mx-auto py-10">
                <div className="text-center">Company not found</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-2xl py-10">
            <div className="mb-6">
                <Link href="/settings/company">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-blue-600">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Company List
                    </Button>
                </Link>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Company: {defaultValues.company_name}</CardTitle>
                    <CardDescription>Update company details and module permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    defaultValue={defaultValues.company_name}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="companyCode">Company Code</Label>
                                <Input
                                    id="companyCode"
                                    name="companyCode"
                                    value={companyCode}
                                    disabled
                                    className="bg-slate-100"
                                />
                                <p className="text-xs text-muted-foreground">Company code cannot be changed.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="contactEmail">Contact Email</Label>
                                <Input
                                    id="contactEmail"
                                    name="contactEmail"
                                    type="email"
                                    defaultValue={defaultValues.contact_email}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Module Permissions</h3>

                            {/* Default Modules (Read-only) */}
                            <div className="rounded-lg border p-4 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-muted-foreground">Import Data</Label>
                                    <Switch checked disabled />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-muted-foreground">View Data</Label>
                                    <Switch checked disabled />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-muted-foreground">Plan Configuration</Label>
                                    <Switch checked disabled />
                                </div>
                            </div>

                            {/* Optional Modules */}
                            <div className="rounded-lg border p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="generateReports">Generate Interim Table (Reports)</Label>
                                    <Switch
                                        id="generateReports"
                                        name="generateReports"
                                        defaultChecked={defaultValues.modules?.includes("generate_reports")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="acaReport">ACA Report Monthly</Label>
                                    <Switch
                                        id="acaReport"
                                        name="acaReport"
                                        defaultChecked={defaultValues.modules?.includes("aca_report")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="pdf1095c">1095-C PDF Generation</Label>
                                    <Switch
                                        id="pdf1095c"
                                        name="pdf1095c"
                                        defaultChecked={defaultValues.modules?.includes("pdf_1095c")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="acaPenalties">Penalty Dashboard</Label>
                                    <Switch
                                        id="acaPenalties"
                                        name="acaPenalties"
                                        defaultChecked={defaultValues.modules?.includes("aca_penalties")}
                                    />
                                </div>
                            </div>
                        </div>

                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
