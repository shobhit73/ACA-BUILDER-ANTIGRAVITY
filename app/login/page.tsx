"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import NextImage from "next/image"
import logo from "@/app/assets/logo.png"
import { toast } from "sonner"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                throw error
            }

            router.push("/")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to login")
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
                        <NextImage src={logo} alt="Compliance Suite Logo" className="h-8 w-8" />
                        <span>ACA Compliance Suite</span>
                    </div>
                </div>
                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight leading-tight">
                        Simplify your IRS reporting with precision and ease.
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Comprehensive 1095-C management, automated penalty analysis, and seamless compliance tracking for modern enterprises.
                    </p>
                </div>
                <div className="relative z-10 text-sm text-slate-400">
                    &copy; 2025 ACA Builder Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-sm space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                        <p className="text-slate-500">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-slate-500">
                        Don&apos;t have an account?{" "}
                        <a href="#" className="font-medium text-slate-900 hover:underline">
                            Contact Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
