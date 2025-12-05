"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { createCompany } from "@/app/actions/company-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Company...
                </>
            ) : (
                "Create Company"
            )}
        </Button>
    )
}

export default function AddCompanyPage() {
    const [state, setState] = useState<{ message?: string; error?: string; success?: boolean }>({})

    async function handleSubmit(formData: FormData) {
        const result = await createCompany({}, formData)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.message)
            // Optional: Redirect or reset form
        }
        setState(result)
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
                    <CardTitle>Add New Company</CardTitle>
                    <CardDescription>Create a new company and assign module permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input id="companyName" name="companyName" placeholder="Acme Corp" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="companyCode">Company Code</Label>
                                <Input id="companyCode" name="companyCode" placeholder="ACME001" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="contactEmail">Contact Email</Label>
                                <Input id="contactEmail" name="contactEmail" type="email" placeholder="admin@acme.com" required />
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
                                    <Switch id="generateReports" name="generateReports" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="acaReport">ACA Report Monthly</Label>
                                    <Switch id="acaReport" name="acaReport" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="pdf1095c">1095-C PDF Generation</Label>
                                    <Switch id="pdf1095c" name="pdf1095c" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="acaPenalties">Penalty Dashboard</Label>
                                    <Switch id="acaPenalties" name="acaPenalties" />
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
