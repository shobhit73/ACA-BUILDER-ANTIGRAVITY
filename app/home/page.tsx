"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, DollarSign, Users, Flag, AlertTriangle, ArrowRight } from "lucide-react"

const modules = [
  {
    id: "aca",
    name: "ACA Reporting",
    description: "1095-C Forms & Penalty Dashboard",
    icon: Shield,
    status: "active" as const,
    href: "/aca",
    color: "from-accent to-accent/80",
  },
  {
    id: "pay-data",
    name: "Pay Data Report",
    description: "EEO-1 Component 2 Pay Data",
    icon: DollarSign,
    status: "coming-soon" as const,
    href: "#",
    color: "from-muted to-muted/80",
  },
  {
    id: "eeo1",
    name: "EEO-1 Report",
    description: "Equal Employment Opportunity Report",
    icon: Users,
    status: "coming-soon" as const,
    href: "#",
    color: "from-muted to-muted/80",
  },
  {
    id: "vets",
    name: "VETS-4212 Report",
    description: "Veterans Employment Report",
    icon: Flag,
    status: "coming-soon" as const,
    href: "#",
    color: "from-muted to-muted/80",
  },
  {
    id: "osha",
    name: "OSHA Reporting",
    description: "Workplace Safety & Injury Logs",
    icon: AlertTriangle,
    status: "coming-soon" as const,
    href: "#",
    color: "from-muted to-muted/80",
  },
]

export default function HomePage() {
  const router = useRouter()

  function handleModuleClick(module: (typeof modules)[0]) {
    if (module.status === "active") {
      router.push(module.href)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Select a Compliance Module
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose from our suite of compliance reporting tools to manage your regulatory requirements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = module.status === "active"

            return (
              <Card
                key={module.id}
                className={`relative overflow-hidden border-2 transition-all duration-300 ${
                  isActive
                    ? "cursor-pointer hover:shadow-xl hover:scale-105 hover:border-accent"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => handleModuleClick(module)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-5`} />

                <CardHeader className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-br ${isActive ? "from-accent to-primary" : "from-muted to-muted-foreground"} flex items-center justify-center`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    {isActive ? (
                      <Badge className="bg-accent text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{module.name}</CardTitle>
                  <CardDescription className="text-sm">{module.description}</CardDescription>
                </CardHeader>

                <CardContent className="relative">
                  {isActive && (
                    <div className="flex items-center text-accent font-medium text-sm">
                      Open Module
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact your compliance administrator or visit our support center
          </p>
        </div>
      </div>
    </main>
  )
}
