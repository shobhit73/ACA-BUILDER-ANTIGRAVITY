"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, LogOut, Shield } from "lucide-react"
import { getEmployerPenaltySummary } from "@/app/actions/get-penalty-summary"
import { useRouter } from "next/navigation"

interface EmployerPenaltySummary {
  employerName: string
  ein: string
  totalPenalty: number
  penaltyA: number
  penaltyB: number
  employeeCount: number
}

interface PenaltySummary {
  grandTotalPenalty: number
  grandTotalPenaltyA: number
  grandTotalPenaltyB: number
  employers: EmployerPenaltySummary[]
}

export default function PenaltySummaryPage() {
  const router = useRouter()
  const year = 2025
  const [summary, setSummary] = useState<PenaltySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
      }
    }
    fetchUser()
  }, [])

    // ... existing useEffect ...

    // ... inside Header ...
    < div className = "flex items-center gap-3 self-end md:self-auto" >
            <span className="text-sm text-white/80">
              {user?.name || "User"}
              {user?.tenant_name && <span className="text-white/60 ml-1">({user.tenant_name})</span>}
            </span>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div >
        </div >
      </div >
    </header >
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">ACA Penalty Summary - {year}</h1>
            <p className="text-muted-foreground mt-2">
              Summary of ACA penalties aggregated by employer (similar to a pivot table)
            </p>
          </div>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </main>
    )
  }

  if (!summary) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center text-muted-foreground py-12">
            Failed to load penalty summary. Please try again.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">ACA Penalty Summary - {year}</h1>
          <p className="text-muted-foreground mt-2">
            Summary of ACA penalties aggregated by employer (similar to a pivot table)
          </p>
        </div>

        <div className="space-y-6">
          {/* Grand Total Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Penalties (All Employers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${summary.grandTotalPenalty.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalty A</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">${summary.grandTotalPenaltyA.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">No coverage offered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalty B</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">${summary.grandTotalPenaltyB.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Unaffordable coverage</p>
              </CardContent>
            </Card>
          </div>

          {/* Employer Breakdown Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Penalty Summary by Employer</CardTitle>
                  <CardDescription>Breakdown of ACA penalties by employer name and EIN</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Downloading..." : "Download Excel"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer Name</TableHead>
                      <TableHead>EIN</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Total Penalty</TableHead>
                      <TableHead className="text-right">Penalty A</TableHead>
                      <TableHead className="text-right">Penalty B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.employers.map((employer, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{employer.employerName}</TableCell>
                        <TableCell className="font-mono text-sm">{employer.ein}</TableCell>
                        <TableCell className="text-right">{employer.employeeCount}</TableCell>
                        <TableCell className="text-right font-bold">${employer.totalPenalty.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">${employer.penaltyA.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-orange-600">${employer.penaltyB.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {summary.employers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No employer data found. Upload census data to see penalty summary.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
