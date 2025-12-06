"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { updateCompany, getCompanyDetails } from "@/app/actions/company-actions"
import { getCompanyAdmins, inviteEmployerAdmin, toggleUserStatus } from "@/app/actions/er-admin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Building2, FileText, Settings, ShieldCheck, Mail, Phone, MapPin, Hash, Info, UserPlus, Pencil, Save, X, Check, Globe, Calendar, User } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

// --- Components ---

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-sm">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </>
            )}
        </Button>
    )
}

function Field({ label, value, children, isEditing, icon: Icon, required, className = "" }: any) {
    if (isEditing) {
        return (
            <div className={`space-y-1.5 ${className}`}>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
                {children}
            </div>
        )
    }
    return (
        <div className={`space-y-1 ${className}`}>
            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </Label>
            <div className="text-sm font-medium text-slate-900 min-h-[20px] break-words">
                {value || <span className="text-slate-300 italic">Not set</span>}
            </div>
        </div>
    )
}

function BooleanField({ label, name, checked, isEditing, tooltip }: any) {
    if (isEditing) {
        return (
            <div className="flex items-center justify-between p-3 border rounded-md bg-white border-slate-200">
                <div className="space-y-0.5">
                    <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
                    {tooltip && <p className="text-[10px] text-slate-500">{tooltip}</p>}
                </div>
                <Switch id={name} name={name} defaultChecked={checked} />
            </div>
        )
    }
    return (
        <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50/50 border-slate-100">
            <div className="space-y-0.5">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                {tooltip && <p className="text-[10px] text-slate-400">{tooltip}</p>}
            </div>
            {checked ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Yes</Badge>
            ) : (
                <Badge variant="secondary" className="bg-slate-200 text-slate-600">No</Badge>
            )}
        </div>
    )
}

function SectionHeader({ title, icon: Icon, description }: any) {
    return (
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
            </div>
        </div>
    )
}

// --- Main Page ---

export default function ManageCompanyPage() {
    const params = useParams()
    const companyCode = params.code as string
    const [isLoading, setIsLoading] = useState(true)
    const [defaultValues, setDefaultValues] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("details")
    const [isEditing, setIsEditing] = useState(false)

    const fetchDetails = async () => {
        try {
            const data = await getCompanyDetails(companyCode)
            if (data.error) {
                toast.error(data.error)
            } else {
                setDefaultValues(data)
            }
        } catch (error) {
            console.error("Error fetching details:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (companyCode) fetchDetails()
    }, [companyCode])

    async function handleSubmit(formData: FormData) {
        const result = await updateCompany(companyCode, {}, formData)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.message)
            setIsEditing(false)
            fetchDetails()
        }
    }

    function handleCancel() {
        setIsEditing(false)
        fetchDetails() // Reset data
        toast.info("Changes discarded")
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!defaultValues) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h2 className="text-xl font-semibold text-slate-800">Company Not Found</h2>
                <Link href="/settings/company">
                    <Button variant="link" className="mt-4 text-blue-600">Return to Company List</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Professional Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)]">
                <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/settings/company">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Separator orientation="vertical" className="h-6 bg-slate-200" />
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {defaultValues.company_name}
                                {isEditing && <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] uppercase font-bold tracking-wider">Editing Mode</Badge>}
                            </h1>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                                <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {companyCode}</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {defaultValues.modified_by ? "Modified by Admin" : "System Created"}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {defaultValues.modified_on ? new Date(defaultValues.modified_on).toLocaleDateString() : "No updates"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <Button onClick={() => setIsEditing(true)} size="sm" className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm">
                                <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                Edit Company
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto max-w-7xl px-6 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-6">
                        <TabItem value="details" label="Company Overview" active={activeTab === "details"} />
                        <TabItem value="modules" label="Module Configuration" active={activeTab === "modules"} />
                        <TabItem value="er-admins" label="Employer Administrators" active={activeTab === "er-admins"} />
                    </TabsList>

                    {/* <form action={handleSubmit}> - REMOVED WRAPPING FORM */}
                    <TabsContent value="details" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <form action={handleSubmit}>
                            <input type="hidden" name="formType" value="details" />
                            <CompanyDetailsSection defaultValues={defaultValues} companyCode={companyCode} isEditing={isEditing} />

                            {/* Footer for Details */}
                            {isEditing && (
                                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-6 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-10">
                                    <span className="text-sm font-medium text-slate-600 mr-2">Unsaved Changes</span>
                                    <Button variant="ghost" size="sm" type="button" onClick={handleCancel} className="h-9 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                        Cancel
                                    </Button>
                                    <SubmitButton />
                                </div>
                            )}
                        </form>
                    </TabsContent>

                    <TabsContent value="modules" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <form action={handleSubmit}>
                            <input type="hidden" name="formType" value="modules" />
                            <ModulesSection defaultValues={defaultValues} isEditing={isEditing} />

                            {/* Footer for Modules */}
                            {isEditing && (
                                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-6 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-10">
                                    <span className="text-sm font-medium text-slate-600 mr-2">Unsaved Changes</span>
                                    <Button variant="ghost" size="sm" type="button" onClick={handleCancel} className="h-9 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                        Cancel
                                    </Button>
                                    <SubmitButton />
                                </div>
                            )}
                        </form>
                    </TabsContent>
                    {/* </form> */}

                    <TabsContent value="er-admins" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ERAdminsSection companyCode={companyCode} isEditing={isEditing} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

function TabItem({ value, label, active }: any) {
    return (
        <TabsTrigger
            value={value}
            className={`
                px-1 py-3 bg-transparent border-b-2 rounded-none shadow-none text-sm font-medium transition-colors
                ${active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }
                data-[state=active]:bg-transparent data-[state=active]:shadow-none
            `}
        >
            {label}
        </TabsTrigger>
    )
}

function CompanyDetailsSection({ defaultValues, companyCode, isEditing }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Core Info */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-800">Company Information</CardTitle>
                                <CardDescription className="text-xs">Legal entity and contact details</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                            <Field label="Company Name" value={defaultValues.company_name} isEditing={isEditing} icon={Building2} required>
                                <Input name="companyName" defaultValue={defaultValues.company_name} required />
                            </Field>
                            <Field label="Company Code" value={companyCode} isEditing={isEditing} icon={Hash}>
                                <Input value={companyCode} disabled className="bg-slate-50 text-slate-500 font-mono" />
                            </Field>
                            <div className="md:col-span-2">
                                <Field label="Primary Contact Email" value={defaultValues.contact_email} isEditing={isEditing} icon={Mail} required>
                                    <Input type="email" name="contactEmail" defaultValue={defaultValues.contact_email} required />
                                </Field>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <FileText className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-800">1094-C Tax Profile</CardTitle>
                                <CardDescription className="text-xs">Filing details and government contacts</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid gap-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Field label="Employer ID (EIN)" value={defaultValues.ein} isEditing={isEditing} icon={Hash}>
                                <Input name="ein" defaultValue={defaultValues.ein} placeholder="00-0000000" className="font-mono" />
                            </Field>
                            <Field label="Contact Phone" value={defaultValues.contact_phone} isEditing={isEditing} icon={Phone}>
                                <Input name="contactPhone" defaultValue={defaultValues.contact_phone} placeholder="+1 (555) 000-0000" />
                            </Field>
                        </div>
                        <Field label="Designated Govt Contact" value={defaultValues.contact_name} isEditing={isEditing} icon={User}>
                            <Input name="contactName" defaultValue={defaultValues.contact_name} placeholder="First Last" />
                        </Field>
                        <Separator />
                        <div className="space-y-6">
                            <Field label="Business Address" value={defaultValues.address_line_1} isEditing={isEditing} icon={MapPin}>
                                <Input name="addressLine1" defaultValue={defaultValues.address_line_1} placeholder="Street Address" />
                            </Field>
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-3">
                                    <Field label="City" value={defaultValues.city} isEditing={isEditing}>
                                        <Input name="city" defaultValue={defaultValues.city} />
                                    </Field>
                                </div>
                                <div className="col-span-1">
                                    <Field label="State" value={defaultValues.state} isEditing={isEditing}>
                                        <Input name="state" defaultValue={defaultValues.state} maxLength={2} className="uppercase" />
                                    </Field>
                                </div>
                                <div className="col-span-2">
                                    <Field label="Zip" value={defaultValues.zip_code} isEditing={isEditing}>
                                        <Input name="zipCode" defaultValue={defaultValues.zip_code} />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Settings */}
            <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden h-fit">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-800">IRS Certifications</CardTitle>
                                <CardDescription className="text-xs">Form 1094-C Part II</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <BooleanField label="Authoritative Transmittal" name="isAuthoritative" checked={defaultValues.is_authoritative_transmittal} isEditing={isEditing} tooltip="Box 19: Filing authoritative transmittal for this EIN" />
                        <BooleanField label="Aggregated Group Member" name="isAggregatedGroup" checked={defaultValues.is_agg_ale_group} isEditing={isEditing} tooltip="Box 21: Member of aggregated ALE group" />
                        <BooleanField label="Qualifying Offer Method" name="certQualifyingOffer" checked={defaultValues.cert_qualifying_offer} isEditing={isEditing} tooltip="Box 22A: Certification of Eligibility" />
                        <BooleanField label="98% Offer Method" name="cert98PercentOffer" checked={defaultValues.cert_98_percent_offer} isEditing={isEditing} tooltip="Box 22D: Certification of Eligibility" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ModulesSection({ defaultValues, isEditing }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden max-w-4xl mx-auto">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <Settings className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-800">System Modules</CardTitle>
                        <CardDescription className="text-xs">Manage active features for this company</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Core */}
                        <div className="p-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Core Platform</h4>
                            <div className="space-y-3">
                                {['Import Data', 'View Data', 'Plan Configuration'].map((module) => (
                                    <div key={module} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100 opacity-75">
                                        <span className="text-sm font-medium text-slate-700">{module}</span>
                                        <Badge variant="secondary" className="bg-slate-200 text-slate-600">Active</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add-ons */}
                        <div className="p-6">
                            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Add-on Features</h4>
                            <div className="space-y-3">
                                <BooleanField label="Generate Interim Reports" name="generateReports" checked={defaultValues.modules?.includes("generate_reports")} isEditing={isEditing} />
                                <BooleanField label="ACA Monthly Reporting" name="acaReport" checked={defaultValues.modules?.includes("aca_report")} isEditing={isEditing} />
                                <BooleanField label="1095-C PDF Generation" name="pdf1095c" checked={defaultValues.modules?.includes("pdf_1095c")} isEditing={isEditing} />
                                <BooleanField label="1094-C PDF Generation" name="pdf1094c" checked={defaultValues.modules?.includes("pdf_1094c")} isEditing={isEditing} />
                                <BooleanField label="Penalty Analysis Dashboard" name="acaPenalties" checked={defaultValues.modules?.includes("aca_penalties")} isEditing={isEditing} />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ERAdminsSection({ companyCode, isEditing }: { companyCode: string, isEditing: boolean }) {
    const [admins, setAdmins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviting, setInviting] = useState(false)

    const fetchAdmins = async () => {
        setLoading(true)
        const result = await getCompanyAdmins(companyCode)
        if (result.data) setAdmins(result.data)
        setLoading(false)
    }

    useEffect(() => {
        fetchAdmins()
    }, [companyCode])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return
        setInviting(true)
        const res = await inviteEmployerAdmin(inviteEmail, companyCode)
        setInviting(false)
        if (res.error) toast.error(res.error)
        else {
            toast.success(res.message)
            setInviteEmail("")
            fetchAdmins()
        }
    }

    const handleToggleStatus = async (user: any) => {
        const newStatus = !user.is_active
        const res = await toggleUserStatus(user.id, newStatus, companyCode)
        if (res.error) toast.error(res.error)
        else {
            toast.success(res.message)
            fetchAdmins()
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <UserPlus className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-800">Employer Administrators</CardTitle>
                                <CardDescription className="text-xs">Users with access to this company portal</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead>Email Address</TableHead>
                                <TableHead>Access Status</TableHead>
                                <TableHead className="text-right">Manage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-32 text-slate-500">Loading...</TableCell>
                                </TableRow>
                            ) : admins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-32 text-slate-500">No active employer admins found.</TableCell>
                                </TableRow>
                            ) : (
                                admins.map(admin => (
                                    <TableRow key={admin.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-700">{admin.email}</TableCell>
                                        <TableCell>
                                            {admin.is_active ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none">Active</Badge>
                                            ) : (
                                                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none shadow-none">Disabled</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isEditing ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(admin)}
                                                    className={admin.is_active ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                                                >
                                                    {admin.is_active ? "Revoke Access" : "Grant Access"}
                                                </Button>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic pr-3">View Only</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className={`border-slate-200 shadow-sm bg-white overflow-hidden transition-opacity ${!isEditing ? "opacity-60 grayscale" : ""}`}>
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-sm font-semibold text-slate-800">Invite New User</CardTitle>
                        <CardDescription className="text-xs">Send registration link via email</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5">
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="inviteEmail" className="text-xs font-medium text-slate-500 uppercase">Email Address</Label>
                                <Input
                                    id="inviteEmail"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                    disabled={!isEditing}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={inviting || !isEditing}>
                                {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Send Invite
                            </Button>
                        </form>
                        {!isEditing && (
                            <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded shadow-sm border">
                                    Edit Mode Required
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
