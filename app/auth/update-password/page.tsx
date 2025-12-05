"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Check if we have a session (from the invite link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/login")
            }
        }
        checkSession()
    }, [supabase, router])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                throw error
            }

            toast.success("Password updated successfully")
            router.push("/")
        } catch (error: any) {
            toast.error(error.message || "Failed to update password")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Branding & Visuals */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <ShieldCheck className="h-6 w-6" />
                        <span>ACA Compliance Suite</span>
                    </div>
                </div>
                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight leading-tight">
                        Secure your account to get started.
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Set a strong password to protect your sensitive compliance data and access the full suite of tools.
                    </p>
                </div>
                <div className="relative z-10 text-sm text-slate-400">
                    &copy; 2025 ACA Builder Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Password Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-sm space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Set Password</h2>
                        <p className="text-slate-500">
                            Please create a new password for your account.
                        </p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Set Password"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
