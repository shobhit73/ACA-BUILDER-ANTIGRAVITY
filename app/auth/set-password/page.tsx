"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import NextImage from "next/image"
import logo from "@/app/assets/logo.png"
import { toast } from "sonner"
import { Suspense } from 'react'

function SetPasswordContent() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingParams, setIsCheckingParams] = useState(true)

    const router = useRouter()
    const searchParams = useSearchParams()
    const roleParam = searchParams.get("role")
    const supabase = createClient()

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                setEmail(user.email)
            } else {
                // If no session, they might need to click the link again or wait for callback handling
                // But invite link with #access_token usually handles session automatically in Supabase Client in typical setups.
                // If not, we might show a warning.
            }
            setIsCheckingParams(false)
        }
        checkSession()
    }, [supabase])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            toast.success("Registration Complete! Logging you in...")

            // Redirect based on role or default
            router.push("/")
            router.refresh()

        } catch (error: any) {
            console.error("Update password error:", error)
            toast.error(error.message || "Failed to set password")
        } finally {
            setIsLoading(false)
        }
    }

    const getHeading = () => {
        if (roleParam === 'employer_admin') return "Register as Employer"
        if (roleParam === 'employee') return "Register as Employee"
        return "Complete Registration"
    }

    if (isCheckingParams) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Branding & Visuals */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <NextImage src={logo} alt="Compliance Suite Logo" className="h-8 w-8" />
                        <span>ACA Compliance Suite</span>
                    </div>
                </div>
                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight leading-tight">
                        Welcome to your new workspace.
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Complete your account setup to access your secure portal.
                    </p>
                </div>
                <div className="relative z-10 text-sm text-slate-400">
                    &copy; 2025 ACA Builder Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-sm space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{getHeading()}</h2>
                        <p className="text-slate-500">
                            Set your password to activate your account.
                        </p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                disabled
                                className="h-11 bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900 pr-10"
                                    placeholder="Min. 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
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
                                    Setting Password...
                                </>
                            ) : (
                                <>
                                    Complete Registration
                                    <CheckCircle2 className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SetPasswordContent />
        </Suspense>
    )
}
