"use client"

import { useEffect, useState } from "react"
import { Lightbulb, TrendingUp, Shield, Users } from "lucide-react"

const acaFacts = [
    {
        icon: Shield,
        title: "ACA Compliance",
        fact: "The Affordable Care Act requires applicable large employers (ALEs) to offer health coverage to at least 95% of their full-time employees.",
    },
    {
        icon: Users,
        title: "Full-Time Employee Definition",
        fact: "Under the ACA, a full-time employee is defined as someone who works an average of 30 hours per week or 130 hours per month.",
    },
    {
        icon: TrendingUp,
        title: "Measurement Period",
        fact: "Employers can use a look-back measurement period (typically 3-12 months) to determine employee eligibility for health coverage.",
    },
    {
        icon: Lightbulb,
        title: "Form 1095-C Purpose",
        fact: "Form 1095-C provides proof of health insurance coverage offered to employees, helping them complete their tax returns accurately.",
    },
    {
        icon: Shield,
        title: "Penalty Protection",
        fact: "Offering affordable, minimum value coverage to 95% of full-time employees helps employers avoid ACA penalties.",
    },
    {
        icon: Users,
        title: "Coverage Affordability",
        fact: "Coverage is considered affordable if the employee's cost for self-only coverage doesn't exceed 9.12% of household income (2023 rate).",
    },
    {
        icon: TrendingUp,
        title: "Minimum Value Standard",
        fact: "A health plan provides minimum value if it covers at least 60% of the total allowed cost of benefits.",
    },
    {
        icon: Lightbulb,
        title: "Reporting Deadline",
        fact: "Employers must file Form 1095-C with the IRS by February 28 (paper) or March 31 (electronic) each year.",
    },
    {
        icon: Shield,
        title: "Safe Harbor Methods",
        fact: "Employers can use safe harbor methods like W-2 wages, rate of pay, or federal poverty line to determine coverage affordability.",
    },
    {
        icon: Users,
        title: "Variable Hour Employees",
        fact: "For variable hour employees, employers can use a measurement period to track hours and determine eligibility prospectively.",
    },
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
        }, 5000) // Change fact every 5 seconds

        return () => clearInterval(interval)
    }, [isUploading])

    if (!isUploading || !isVisible) return null

    const currentFact = acaFacts[currentFactIndex]
    const Icon = currentFact.icon

    return (
        <div className={`animate-slide-in-up ${className}`}>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 p-6 shadow-lg">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/50 via-teal-100/50 to-blue-100/50 animate-shimmer" />

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 shadow-lg animate-pulse-glow">
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-cyan-900 mb-2">{currentFact.title}</h3>
                            <p className="text-sm text-cyan-800 leading-relaxed">{currentFact.fact}</p>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-4 flex gap-1">
                        {acaFacts.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${index === currentFactIndex
                                        ? "bg-gradient-to-r from-cyan-500 to-teal-500"
                                        : "bg-cyan-200"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
