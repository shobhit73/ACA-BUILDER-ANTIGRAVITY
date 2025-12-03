import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Database, Settings, Info, Save, Server, Shield } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600 mt-1">Manage your ACA Builder configuration and preferences</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Database Settings */}
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Database className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Database Connection</CardTitle>
                <CardDescription>Supabase database configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Database URL</Label>
              <div className="flex gap-2">
                <Input type="text" value="Connected to Supabase" disabled className="bg-slate-50" />
                <div className="flex items-center justify-center px-3 bg-green-100 text-green-700 rounded-md border border-green-200 text-sm font-medium">
                  Active
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Connection Status</Label>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-cyan-100">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">System Online</span>
                <span className="text-xs text-slate-500 ml-auto">Latency: 45ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Settings */}
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Settings className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Import Configuration</CardTitle>
                <CardDescription>Configure data import behavior</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchSize" className="text-slate-700">Batch Size</Label>
                <Input id="batchSize" type="number" defaultValue="10" className="border-teal-200 focus:border-teal-500" />
                <p className="text-xs text-slate-500">Rows per batch</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryAttempts" className="text-slate-700">Retry Attempts</Label>
                <Input id="retryAttempts" type="number" defaultValue="3" className="border-teal-200 focus:border-teal-500" />
                <p className="text-xs text-slate-500">Max retries on fail</p>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2 p-2 bg-teal-50/50 rounded text-xs text-teal-800">
                <Info className="h-4 w-4" />
                Higher batch sizes may improve speed but increase memory usage.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="md:col-span-2 border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Server className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">System Information</CardTitle>
                <CardDescription>Current application environment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Version</Label>
                <div className="font-mono text-sm font-medium text-slate-900">v1.0.0</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Environment</Label>
                <div className="font-mono text-sm font-medium text-slate-900">Production</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Framework</Label>
                <div className="font-mono text-sm font-medium text-slate-900">Next.js 14</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Database</Label>
                <div className="font-mono text-sm font-medium text-slate-900">PostgreSQL 15</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Region</Label>
                <div className="font-mono text-sm font-medium text-slate-900">us-east-1</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Security</Label>
                <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                  <Shield className="h-3 w-3" />
                  Secured
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
