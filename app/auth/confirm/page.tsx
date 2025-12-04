"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AuthConfirmPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const next = searchParams.get("next") || "/auth/update-password"
    const [status, setStatus] = useState("Verifying invitation...")

    useEffect(() => {
        const supabase = createClient()

        const handleAuth = async () => {
            // 1. Check for existing session
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                console.log("Session found, redirecting...")
                setStatus("Redirecting...")
                router.replace(next)
                return
            }

            // 2. Check for hash fragment (Implicit Flow)
            const hash = window.location.hash
            if (hash && hash.includes("access_token")) {
                console.log("Hash found, parsing...")
                const params = new URLSearchParams(hash.substring(1)) // remove #
                const accessToken = params.get("access_token")
                const refreshToken = params.get("refresh_token")

                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    })

                    if (!error) {
                        console.log("Session set manually, redirecting...")
                        setStatus("Redirecting...")
                        toast.success("Invitation accepted!")
                        router.replace(next)
                        return
                    } else {
                        console.error("Error setting session:", error)
                        setStatus("Error verifying invitation.")
                    }
                }
            }

            // 3. Listen for auth state change (Fallback)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log("Auth event:", event)
                if (event === "SIGNED_IN" && session) {
                    setStatus("Redirecting...")
                    toast.success("Invitation accepted!")
                    router.replace(next)
                } else if (event === "SIGNED_OUT") {
                    // setStatus("Please sign in.")
                }
            })

            return () => {
                subscription.unsubscribe()
            }
        }

        handleAuth()
    }, [router, next])

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
                <h2 className="mt-4 text-lg font-medium text-slate-900">{status}</h2>
                <p className="mt-2 text-sm text-slate-500">Please wait while we set up your account.</p>
            </div>
        </div>
    )
}
