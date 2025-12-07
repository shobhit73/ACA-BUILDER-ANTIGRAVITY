import type React from "react"
/**
 * Root Layout
 * 
 * The top-level layout component for the entire application.
 * 
 * Responsibilities:
 * 1. **Global Styles**: Imports globals.css (Tailwind/Theme).
 * 2. **Font Optimization**: Configures 'Inter' font via next/font.
 * 3. **Providers**: Wraps the app in:
 *    - `Toaster`: For toast notifications (Sonner).
 *    - `TooltipProvider`: For UI tooltips.
 * 
 * Note: RLS and Auth checks happen in Middleware and Page/Action layers,
 * but this layout ensures all pages inherit the same base UI context.
 */
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ACA 1095-C Builder",
  description: "IRS Form 1095-C Data Management and Reporting System",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased h-screen w-screen overflow-hidden`}>
        <AppShell>
          {children}
        </AppShell>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
