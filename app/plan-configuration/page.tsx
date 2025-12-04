'use client';

import { useState, useEffect } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Upload as UploadIcon, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Plan {
    plan_code: string;
    plan_name: string;
    carrier_name?: string;
    plan_type?: string;
    mec?: string; // Y/N
    mvc?: string; // Y/N
    me?: string; // Y/N
    option_emp: string | null;
    option_emp_spouse: string | null;
    option_emp_child: string | null;
    option_emp_family: string | null;
}

interface PlanConfigData {
    plans: Plan[];
    planOptions: Record<string, string[]>;
}

export default function PlanConfigurationPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PlanConfigData | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/plan-config');
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load plan configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (planCode: string, field: string, value: string) => {
        // Optimistic update
        if (!data) return;
        const newPlans = data.plans.map(p =>
            p.plan_code === planCode ? { ...p, [field]: value } : p
        );
        setData({ ...data, plans: newPlans });
    };

    const handleSave = async (plan: Plan) => {
        setSaving(plan.plan_code);
        try {
            const res = await fetch('/api/plan-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    plan: plan
                }),
            });

            if (!res.ok) throw new Error('Failed to save');
            toast.success(`Plan ${plan.plan_code} updated`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save plan');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (planCode: string) => {
        setDeleting(planCode);
        try {
            const res = await fetch('/api/plan-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    plan_code: planCode
                }),
            });

            if (!res.ok) throw new Error('Failed to delete');
            toast.success(`Plan ${planCode} deleted`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete plan');
        } finally {
            setDeleting(null);
        }
    };

    const handleCreate = async () => {
        if (!newPlan.plan_code || !newPlan.plan_name) {
            toast.error('Plan Code and Name are required');
            return;
        }

        try {
            const res = await fetch('/api/plan-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    plan: newPlan
                }),
            });

            if (!res.ok) throw new Error('Failed to create');
            toast.success('Plan created successfully');
            setIsAddOpen(false);
            setNewPlan({});
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create plan');
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const res = await fetch('/api/plan-config/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');
            const json = await res.json();
            toast.success(`Uploaded ${json.count} plans`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload plans');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Breadcrumb className="mb-4">
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Plan Configuration</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Plan Master Management</h1>
                    <p className="mt-2 text-slate-600">
                        Manage your health plans, configure details (MEC, MV), and map coverage tiers.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                                <Plus className="mr-2 h-4 w-4" /> Add Plan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Plan</DialogTitle>
                                <DialogDescription>
                                    Create a new plan in the master list.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right">Code</Label>
                                    <Input id="code" value={newPlan.plan_code || ''} onChange={e => setNewPlan({ ...newPlan, plan_code: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" value={newPlan.plan_name || ''} onChange={e => setNewPlan({ ...newPlan, plan_name: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="mec" className="text-right">MEC</Label>
                                    <Select onValueChange={v => setNewPlan({ ...newPlan, me: v })}>
                                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent><SelectItem value="Y">Yes</SelectItem><SelectItem value="N">No</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="mvc" className="text-right">MV</Label>
                                    <Select onValueChange={v => setNewPlan({ ...newPlan, mvc: v })}>
                                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent><SelectItem value="Y">Yes</SelectItem><SelectItem value="N">No</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate}>Create Plan</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleUpload}
                        />
                        <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                            <UploadIcon className="mr-2 h-4 w-4" /> Upload CSV
                        </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Plan List & Configuration</CardTitle>
                    <CardDescription>
                        Edit plan details and map option codes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-[150px]">Plan Code</TableHead>
                                        <TableHead className="w-[200px]">Plan Name</TableHead>
                                        <TableHead className="w-[80px]">MEC</TableHead>
                                        <TableHead className="w-[80px]">MV</TableHead>
                                        <TableHead className="w-[150px]">Discovered Options</TableHead>
                                        <TableHead>Emp Only (1)</TableHead>
                                        <TableHead>Emp+Spouse (3)</TableHead>
                                        <TableHead>Emp+Child (2)</TableHead>
                                        <TableHead>Family (4)</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.plans.map((plan) => (
                                        <TableRow key={plan.plan_code}>
                                            <TableCell className="font-medium">{plan.plan_code}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={plan.plan_name || ''}
                                                    onChange={(e) => handleUpdate(plan.plan_code, 'plan_name', e.target.value)}
                                                    className="h-8 w-full"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={String(plan.me) === 'true' || plan.me === 'Y' ? 'Y' : (String(plan.me) === 'false' || plan.me === 'N' ? 'N' : '')}
                                                    onValueChange={v => handleUpdate(plan.plan_code, 'me', v)}
                                                >
                                                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={String(plan.mvc) === 'true' || plan.mvc === 'Y' ? 'Y' : (String(plan.mvc) === 'false' || plan.mvc === 'N' ? 'N' : '')}
                                                    onValueChange={v => handleUpdate(plan.plan_code, 'mvc', v)}
                                                >
                                                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {data.planOptions[plan.plan_code]?.map(opt => (
                                                        <span key={opt} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                            {opt}
                                                        </span>
                                                    )) || <span className="text-muted-foreground text-xs">None</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={plan.option_emp || ''}
                                                    onChange={(e) => handleUpdate(plan.plan_code, 'option_emp', e.target.value)}
                                                    placeholder="e.g. 1"
                                                    className="h-8 w-20"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={plan.option_emp_spouse || ''}
                                                    onChange={(e) => handleUpdate(plan.plan_code, 'option_emp_spouse', e.target.value)}
                                                    placeholder="e.g. 3"
                                                    className="h-8 w-20"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={plan.option_emp_child || ''}
                                                    onChange={(e) => handleUpdate(plan.plan_code, 'option_emp_child', e.target.value)}
                                                    placeholder="e.g. 2"
                                                    className="h-8 w-20"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={plan.option_emp_family || ''}
                                                    onChange={(e) => handleUpdate(plan.plan_code, 'option_emp_family', e.target.value)}
                                                    placeholder="e.g. 4"
                                                    className="h-8 w-20"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSave(plan)}
                                                        disabled={saving === plan.plan_code}
                                                    >
                                                        {saving === plan.plan_code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-blue-600" />}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete plan <strong>{plan.plan_code}</strong>? This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(plan.plan_code)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
