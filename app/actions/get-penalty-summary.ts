"use server"

import { createServerClient } from "@/lib/supabase/server"

interface EmployerPenaltySummary {
  employerName: string
  ein: string
  totalPenalty: number
  penaltyA: number
  penaltyB: number
  employeeCount: number
}

export async function getEmployerPenaltySummary(year: number): Promise<{
  grandTotalPenalty: number
  grandTotalPenaltyA: number
  grandTotalPenaltyB: number
  employers: EmployerPenaltySummary[]
}> {
  const supabase = await createServerClient()

  // Monthly penalty amounts
  const PENALTY_A_AMOUNT = 241.67
  const PENALTY_B_AMOUNT = 362.5

  // Get all employees with their employer info
  const { data: employees, error } = await supabase.from("employee_details").select("employee_id, employer_name, ein")

  if (error || !employees) {
    throw new Error("Failed to fetch employees")
  }

  // Group employees by employer
  const employerMap = new Map<string, { name: string; ein: string; employees: string[] }>()

  for (const emp of employees) {
    const key = `${emp.employer_name || "Unknown"}_${emp.ein || "Unknown"}`
    if (!employerMap.has(key)) {
      employerMap.set(key, {
        name: emp.employer_name || "Unknown Employer",
        ein: emp.ein || "Unknown EIN",
        employees: [],
      })
    }
    employerMap.get(key)!.employees.push(emp.employee_id.toString())
  }

  // Calculate penalties for each employer
  const employerSummaries: EmployerPenaltySummary[] = []
  let grandTotalPenalty = 0
  let grandTotalPenaltyA = 0
  let grandTotalPenaltyB = 0

  for (const [, employer] of employerMap) {
    let employerPenaltyA = 0
    let employerPenaltyB = 0

    // Process each employee
    for (const employeeId of employer.employees) {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`

      // Get status, eligibility, and enrollment data
      const { data: statusData } = await supabase
        .from("employee_status_monthly")
        .select("month_start, is_full_time_full_month")
        .eq("employee_id", employeeId)
        .gte("month_start", yearStart)
        .lte("month_start", yearEnd)

      const { data: eligibilityData } = await supabase
        .from("eligibility_monthly")
        .select("month_start, employee_eligible_full_month, plan_cost")
        .eq("employee_id", employeeId)
        .gte("month_start", yearStart)
        .lte("month_start", yearEnd)

      const { data: enrollmentData } = await supabase
        .from("enrollment_monthly")
        .select("month_start, employee_enrolled, plancode")
        .eq("employee_id", employeeId)
        .gte("month_start", yearStart)
        .lte("month_start", yearEnd)

      // Create lookup maps
      const statusMap = new Map((statusData || []).map((s) => [new Date(s.month_start).getMonth(), s]))
      const eligibilityMap = new Map((eligibilityData || []).map((e) => [new Date(e.month_start).getMonth(), e]))
      const enrollmentMap = new Map((enrollmentData || []).map((e) => [new Date(e.month_start).getMonth(), e]))

      // Calculate penalties for each month
      for (let month = 0; month < 12; month++) {
        const status = statusMap.get(month)
        const eligibility = eligibilityMap.get(month)
        const enrollment = enrollmentMap.get(month)

        const isFullTime = status?.is_full_time_full_month || false
        const isEligible = eligibility?.employee_eligible_full_month || false
        const planCost = eligibility?.plan_cost || 0
        const isWaived = enrollment?.plancode === "Waive"

        // Penalty A: No coverage offered
        if (isFullTime && !isEligible) {
          employerPenaltyA += PENALTY_A_AMOUNT
        }
        // Penalty B: Unaffordable coverage offered and waived
        else if (isFullTime && isEligible && planCost > 50 && isWaived) {
          employerPenaltyB += PENALTY_B_AMOUNT
        }
      }
    }

    const totalPenalty = employerPenaltyA + employerPenaltyB

    employerSummaries.push({
      employerName: employer.name,
      ein: employer.ein,
      totalPenalty,
      penaltyA: employerPenaltyA,
      penaltyB: employerPenaltyB,
      employeeCount: employer.employees.length,
    })

    grandTotalPenalty += totalPenalty
    grandTotalPenaltyA += employerPenaltyA
    grandTotalPenaltyB += employerPenaltyB
  }

  return {
    grandTotalPenalty,
    grandTotalPenaltyA,
    grandTotalPenaltyB,
    employers: employerSummaries.sort((a, b) => b.totalPenalty - a.totalPenalty),
  }
}
