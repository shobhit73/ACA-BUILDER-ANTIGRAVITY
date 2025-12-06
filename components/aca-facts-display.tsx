"use client"

import { useEffect, useState } from "react"
import { Lightbulb, TrendingUp, Shield, Users, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const acaFacts = [
    {
        icon: Shield,
        title: "ACA Compliance",
        fact: "Applicable Large Employers (ALEs) must offer health coverage to at least 95% of full-time employees to maintain compliance.",
    },
    {
        icon: Users,
        title: "Full-Time Definition",
        fact: "A full-time employee is defined as one working 30+ hours/week or 130+ hours/month using the monthly measurement method.",
    },
    {
        icon: TrendingUp,
        title: "Measurement Periods",
        fact: "Look-back measurement periods (3-12 months) allow you to stabilize coverage eligibility for variable hour employees.",
    },
    {
        icon: Lightbulb,
        title: "Form 1095-C Purpose",
        fact: "Form 1095-C serves as proof of insurance offers, helping employees claim premium tax credits or verify coverage.",
    },
    {
        icon: Shield,
        title: "Penalty Protection",
        fact: "Providing Minimum Value and Affordable coverage protects your organization from IRS 4980H(b) penalties.",
    },
    {
        icon: Users,
        title: "Affordability Threshold",
        fact: "For 2024, coverage is affordable if the employee's contribution does not exceed 8.39% of their household income (approx).",
    },
    {
        icon: Info,
        title: "Minimum Value",
        fact: "A plan provides Minimum Value if it covers at least 60% of the total allowed cost of benefits expected to be incurred.",
    }
]

interface ACAFactsDisplayProps {
    isUploading?: boolean
    className?: string
}

export function ACAFactsDisplay({ isUploading = false, className = "" }: ACAFactsDisplayProps) {
    const [currentFactIndex, setCurrentFactIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (!isUploading) return

        setIsVisible(true)
        const interval = setInterval(() => {
            setCurrentFactIndex((prev) => (prev + 1) % acaFacts.length)
        }, 6000) // Slower rotation for better readability

        return () => clearInterval(interval)
    }, [isUploading])

    if (!isUploading || !isVisible) return null

    const currentFact = acaFacts[currentFactIndex]
    const Icon = currentFact.icon

    return (
        <div className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${className}`}>
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex gap-5">
                        {/* Icon Side */}
                        <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                <Icon className="h-5 w-5 text-indigo-600" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                    Did you know?
                                </h4>
                                <span className="text-xs text-slate-400 font-medium">
                                    Fact {currentFactIndex + 1} of {acaFacts.length}
                                </span>
                            </div>

                            <h3 className="text-base font-medium text-slate-800 mb-1">
                                {currentFact.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {currentFact.fact}
                            </p>
                        </div>
                    </div>

                    {/* Subtle Progress Bar */}
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${((currentFactIndex + 1) / acaFacts.length) * 100}%` }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
