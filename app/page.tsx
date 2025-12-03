import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Upload, Database, FileOutput, TrendingUp, Users, FileSpreadsheet, CheckCircle } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome to ACA 1095-C Builder - Streamline your IRS Form 1095-C preparation
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900">Data Import</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">10 Files</div>
            <p className="text-xs text-cyan-600 mt-1">CSV files to import</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-900">Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">13 Tables</div>
            <p className="text-xs text-teal-600 mt-1">Including interim tables</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">ACA Interim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">3 Tables</div>
            <p className="text-xs text-blue-600 mt-1">Monthly tracking data</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">Ready</div>
            <p className="text-xs text-purple-600 mt-1">Generate 1095-C forms</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-cyan-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Import Data</CardTitle>
                <CardDescription className="text-xs">Upload CSV files</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Upload 10 CSV files to populate employee, plan, and payroll data
            </p>
            <Link href="/import">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                Go to Import
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-teal-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">View Data</CardTitle>
                <CardDescription className="text-xs">Browse tables</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              View and verify all imported data across database tables
            </p>
            <Link href="/data-viewer">
              <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600">
                View Data
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-purple-400">
                <FileOutput className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Generate Reports</CardTitle>
                <CardDescription className="text-xs">Create 1095-C forms</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Generate ACA interim tables and download 1095-C ready files
            </p>
            <Link href="/reports">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                Generate Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>ACA 1095-C Workflow</CardTitle>
          <CardDescription>Follow these steps to prepare your 1095-C forms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 text-white font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Base Data
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Upload 10 CSV files: Company Details, Plan Master, Employee Census, and more
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-white font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate Interim Tables
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Process data to create monthly tracking tables for status, offers, and enrollment
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-400 text-white font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileOutput className="h-4 w-4" />
                  Download Reports
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Export interim CSV files ready for final 1095-C form generation
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
          <CardDescription>Everything you need for ACA compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <CheckCircle className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Data Validation</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Automatic validation and error reporting for all imported data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <TrendingUp className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Batch Processing</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Process thousands of records quickly with concurrent batch uploads
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Interim Tables</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Generate monthly status, offer, and enrollment tracking tables
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <Users className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Employee Management</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Track employee census, eligibility, enrollment, and dependent data
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
