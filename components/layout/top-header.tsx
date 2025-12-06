"use client"

import Link from "next/link"
import NextImage from "next/image"
import logo from "@/app/assets/logo.png"
import { LogOut, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface TopHeaderProps {
    user: {
        name: string
        email: string
        role: string
    }
}

export function TopHeader({ user }: TopHeaderProps) {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut()
            router.push("/login")
            router.refresh()
            toast.success("Logged out successfully")
        } catch (error) {
            toast.error("Error logging out")
        }
    }

    return (
        <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md z-40">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo Section - Matching Sidebar Style */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                    <NextImage src={logo} alt="Compliance Suite Logo" className="h-8 w-8" />
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-none tracking-tight text-white">Compliance Suite</h1>
                        <p className="text-[10px] text-slate-400 font-medium">Employee Portal</p>
                    </div>
                </Link>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-800 focus:ring-0">
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings/users" className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>My Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings/users" className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Account Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
