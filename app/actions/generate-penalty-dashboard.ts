"use server"

import { createServerClient } from "@/lib/supabase/server"

/**
 * 💰 ACA PENALTY DASHBOARD - SERVER ACTION
 *
 * This file calculates ACA (Affordable Care Act) penalties for employers.
 * Under the ACA, employers with 50+ full-time employees must offer affordable
 * health insurance or face penalties.
 *
 * 🎯 WHAT THIS FILE DOES:
 * Analyzes employee data to determine if the employer owes penalties and calculates amounts.
 *
 * 📊 TWO TYPES OF PENALTIES:
 *
 * **Penalty A ($241.67/month per employee):**
 * - Triggered when: Full-time employee is NOT offered health insurance
 * - Why it matters: Employer failed to offer Minimum Essential Coverage (MEC)
 * - Example: Employee works 30+ hours/week but has no insurance option
 *
 * **Penalty B ($362.50/month per employee):**
 * - Triggered when: Full-time employee is offered insurance BUT:
 *   1. The cost is unaffordable (> $50/month for employee-only coverage)
 *   2. AND the employee waived/declined coverage
 * - Why it matters: Employer offered coverage but it wasn't affordable
 * - Example: Employee offered plan at $75/month, declined it
 *
 * 🔍 HOW WE DETERMINE PENALTIES:
 * For each employee, for each month, we check:
 * 1. Is employee full-time? (from employee_status_monthly table)
 * 2. Is employee eligible for coverage? (from eligibility_monthly table)
 * 3. What's the employee cost? (from eligibility_monthly.plan_cost)
 * 4. Did employee enroll or waive? (from enrollment_monthly table)
 *
 * 💡 KEY INSIGHTS:
 * - Penalties are calculated monthly, then summed for the year
 * - An employee can have different penalty types in different months
 * - "Waived" means plan_code = "Waive" in enrollment_monthly table
 * - Affordability threshold is $50/month (simplified for this implementation)
 *
 * 🚀 REAL-WORLD USAGE:
 * This data helps employers:
 * - Understand their ACA compliance status
 * - Identify which employees trigger penalties
 * - Calculate potential IRS penalties before filing
 * - Make decisions about plan affordability
 */

/**
 * 💰 EMPLOYEE PENALTY DATA STRUCTURE
 *
 * This interface defines the structure of penalty data for each employee.
 * Each employee can have Penalty A, Penalty B, or no penalty for each month.
 *
 * 📋 FIELDS EXPLAINED:
 * - employeeId: Unique identifier for the employee
 * - employeeName: Full name for display in reports
 * - department: Department of the employee
 * - employer: Employer name
 * - ein: Employer Identification Number
 * - penaltyType: The type of penalty (or "No Penalty" if compliant)
 * - reason: Human-readable explanation of why penalty applies
 * - monthlyPenalties: Array of 12 numbers (Jan-Dec), null means no penalty that month
 * - totalPenalty: Sum of all monthly penalties for the year
 *
 * 💡 WHY MONTHLY PENALTIES?
 * Employees can change status during the year:
 * - Hired mid-year (only penalized for months employed)
 * - Changed from part-time to full-time
 * - Enrolled in coverage mid-year
 * So we track penalties month-by-month for accuracy.
 */
export interface EmployeePenaltyData {
  employeeId: string // Employee's unique ID (stored as string for consistency)
  employeeName: string // "FirstName LastName" format for display
  department: string // Department of the employee
  employer: string // Employer name
  ein: string // Employer Identification Number
  penaltyType: "Penalty A" | "Penalty B" | "No Penalty" // Overall penalty classification
  reason: string // Explanation like "No MEC offered" or "MEC offered but unaffordable (cost: $75) and employee waived"
  monthlyPenalties: (number | null)[] // 12 months, null means no penalty ("-" in Excel)
  totalPenalty: number // Sum of all monthly penalties
}

/**
 * 📊 GENERATE PENALTY DASHBOARD DATA
 *
 * This is the main function that calculates penalties for all employees.
 *
 * 🎯 ALGORITHM:
 * 1. Fetch all employees from employee_details table
 * 2. For each employee:
 *    a. Fetch their monthly status (full-time or not)
 *    b. Fetch their monthly eligibility (offered coverage or not)
 *    c. Fetch their monthly enrollment (enrolled or waived)
 * 3. For each month (Jan-Dec):
 *    a. Check if employee is full-time
 *    b. Check if employee is eligible for coverage
 *    c. Check the cost of coverage
 *    d. Check if employee enrolled or waived
 *    e. Apply penalty rules to determine if penalty applies
 * 4. Sum up monthly penalties to get total
 * 5. Determine overall penalty type and reason
 *
 * 🔥 PENALTY RULES (SIMPLIFIED):
 *
 * **Rule 1: Penalty A**
 * IF employee is full-time AND NOT eligible for coverage
 * THEN penalty = $241.67 for that month
 * REASON: "No MEC offered"
 *
 * **Rule 2: Penalty B**
 * IF employee is full-time AND eligible for coverage
 *    AND cost > $50 AND employee waived (plan_code = "Waive")
 * THEN penalty = $362.50 for that month
 * REASON: "MEC offered but unaffordable (cost: $XX) and employee waived"
 *
 * **Rule 3: No Penalty**
 * IF employee is part-time OR enrolled in coverage OR coverage is affordable
 * THEN no penalty
 * REASON: "Affordable coverage offered and enrolled"
 *
 * 💡 DATA SOURCES:
 * - employee_details: Employee names and IDs
 * - employee_status_monthly: Full-time status by month
 * - eligibility_monthly: Coverage eligibility and cost by month
 * - enrollment_monthly: Enrollment status and plan code by month
 *
 * 🚀 PERFORMANCE NOTES:
 * - Processes employees sequentially (one at a time)
 * - For 1000 employees, this takes ~10-30 seconds
 * - Could be optimized with batch queries or parallel processing
 * - But sequential is safer for database connections
 *
 * @param year - The tax year to calculate penalties for (e.g., 2024, 2025)
 * @returns Array of employee penalty data, one object per employee
 * @throws Error if database queries fail
 */
export async function generatePenaltyDashboard(year: number): Promise<EmployeePenaltyData[]> {
  // 🔐 CREATE SUPABASE CLIENT
  // This uses the singleton pattern to reuse database connections
  const supabase = await createServerClient()

  // 💰 PENALTY AMOUNTS (MONTHLY)
  // These are the IRS-defined penalty amounts for 2024-2025
  // They're adjusted annually for inflation
  const PENALTY_A_AMOUNT = 241.67 // No coverage offered
  const PENALTY_B_AMOUNT = 362.5 // Unaffordable coverage offered

  // 📅 DATE RANGE FOR THE YEAR
  // We'll query data for the entire calendar year
  const yearStart = `${year}-01-01` // January 1st
  const yearEnd = `${year}-12-31` // December 31st

  // 👥 FETCH ALL EMPLOYEES
  // Get employee IDs and names from the employee_details table
  // We only need these three fields for the penalty dashboard
  const { data: employees, error: empError } = await supabase
    .from("employee_details")
    .select("employee_id, first_name, last_name, employee_category, employer_name, ein") // Only select what we need

  // ❌ ERROR HANDLING
  // If the query fails or returns no data, throw an error
  if (empError || !employees) {
    throw new Error("Failed to fetch employees")
  }

  // 📦 RESULTS ARRAY
  // This will store the penalty data for all employees
  const results: EmployeePenaltyData[] = []

  // 🔄 LOOP THROUGH EACH EMPLOYEE
  // Process one employee at a time (sequential processing)
  for (const emp of employees) {
    // Convert employee_id to string for consistency
    // (Some tables store it as number, others as text)
    const employeeId = emp.employee_id.toString()

    // Format employee name as "FirstName LastName"
    const employeeName = `${emp.first_name} ${emp.last_name}`

    // 📊 INITIALIZE MONTHLY PENALTIES ARRAY
    // Start with 12 months of null (no penalty)
    // We'll fill in actual penalty amounts as we process each month
    const monthlyPenalties: (number | null)[] = Array(12).fill(null)

    // 🏷️ INITIALIZE PENALTY CLASSIFICATION
    // Start with "No Penalty" and update if we find penalties
    let penaltyType: "Penalty A" | "Penalty B" | "No Penalty" = "No Penalty"
    let reason = "Affordable coverage offered and enrolled" // Default reason
    let totalPenalty = 0 // Running total of penalties

    // 📅 FETCH EMPLOYEE STATUS DATA (FULL-TIME OR PART-TIME)
    // Query the employee_status_monthly table for this employee's status each month
    const { data: statusData } = await supabase
      .from("employee_status_monthly")
      .select("month_start, is_full_time_full_month") // Only need these two fields
      .eq("employee_id", employeeId) // Filter to this employee
      .gte("month_start", yearStart) // From January 1st
      .lte("month_start", yearEnd) // To December 31st
      .order("month_start") // Order by month (Jan, Feb, Mar, ...)

    // 🏥 FETCH ELIGIBILITY DATA (OFFERED COVERAGE OR NOT)
    // Query the eligibility_monthly table for this employee's eligibility each month
    const { data: eligibilityData } = await supabase
      .from("eligibility_monthly")
      .select("month_start, employee_eligible_full_month, plan_cost") // Need eligibility flag and cost
      .eq("employee_id", employeeId)
      .gte("month_start", yearStart)
      .lte("month_start", yearEnd)
      .order("month_start")

    // 📝 FETCH ENROLLMENT DATA (ENROLLED OR WAIVED)
    // Query the enrollment_monthly table for this employee's enrollment each month
    const { data: enrollmentData } = await supabase
      .from("enrollment_monthly")
      .select("month_start, employee_enrolled, plancode") // Need enrollment flag and plan code
      .eq("employee_id", employeeId)
      .gte("month_start", yearStart)
      .lte("month_start", yearEnd)
      .order("month_start")

    // 🗺️ CREATE LOOKUP MAPS FOR FAST ACCESS
    // Convert arrays to Maps for O(1) lookup by month
    // This is more efficient than searching arrays for each month
    const statusMap = new Map((statusData || []).map((s) => [new Date(s.month_start).getMonth(), s]))
    const eligibilityMap = new Map((eligibilityData || []).map((e) => [new Date(e.month_start).getMonth(), e]))
    const enrollmentMap = new Map((enrollmentData || []).map((e) => [new Date(e.month_start).getMonth(), e]))

    // 🔍 TRACK PENALTY TYPES
    // We need to know if employee has Penalty A or B (or both in different months)
    let hasPenaltyA = false
    let hasPenaltyB = false
    let penaltyBCost = 0 // Store the cost for Penalty B reason

    // 📅 LOOP THROUGH EACH MONTH (0-11 = Jan-Dec)
    for (let month = 0; month < 12; month++) {
      // 📊 GET DATA FOR THIS MONTH
      // Look up the status, eligibility, and enrollment for this month
      const status = statusMap.get(month)
      const eligibility = eligibilityMap.get(month)
      const enrollment = enrollmentMap.get(month)

      // ✅ CHECK FULL-TIME STATUS
      // Is the employee full-time for the full month?
      const isFullTime = status?.is_full_time_full_month || false

      // ✅ CHECK ELIGIBILITY
      // Is the employee eligible for coverage?
      const isEligible = eligibility?.employee_eligible_full_month || false

      // 💰 CHECK PLAN COST
      // How much does the employee have to pay per month?
      const planCost = eligibility?.plan_cost || 0

      // 📝 CHECK ENROLLMENT STATUS
      // Is the employee enrolled or did they waive?
      const isEnrolled = enrollment?.employee_enrolled || false
      const isWaived = enrollment?.plancode === "Waive" // 🔥 KEY: Check if plan code is "Waive"

      // 🚨 APPLY PENALTY RULES

      // **RULE 1: PENALTY A**
      // Full-time employee NOT offered coverage
      if (isFullTime && !isEligible) {
        monthlyPenalties[month] = PENALTY_A_AMOUNT // $241.67
        totalPenalty += PENALTY_A_AMOUNT
        hasPenaltyA = true
      }
      // **RULE 2: PENALTY B**
      // Full-time employee offered coverage BUT it's unaffordable AND they waived
      else if (isFullTime && isEligible && planCost > 50 && isWaived) {
        monthlyPenalties[month] = PENALTY_B_AMOUNT // $362.50
        totalPenalty += PENALTY_B_AMOUNT
        hasPenaltyB = true
        penaltyBCost = planCost // Store cost for reason text
      }
      // **RULE 3: NO PENALTY**
      // All other cases (part-time, enrolled, affordable, etc.)
      else {
        monthlyPenalties[month] = null // No penalty this month
      }
    }

    // 🏷️ DETERMINE OVERALL PENALTY TYPE AND REASON
    // Based on which penalties were found across all months

    if (hasPenaltyA) {
      // Employee has Penalty A in at least one month
      penaltyType = "Penalty A"
      reason = "No MEC offered" // MEC = Minimum Essential Coverage
    } else if (hasPenaltyB) {
      // Employee has Penalty B in at least one month
      penaltyType = "Penalty B"
      reason = `MEC offered but unaffordable (cost: $${penaltyBCost.toFixed(2)}) and employee waived`
    }
    // else: penaltyType stays "No Penalty" with default reason

    // 📦 ADD EMPLOYEE TO RESULTS
    results.push({
      employeeId,
      employeeName,
      department: emp.employee_category || "Unassigned",
      employer: emp.employer_name || "Unknown Employer",
      ein: emp.ein || "", // Employer Identification Number
      penaltyType,
      reason,
      monthlyPenalties,
      totalPenalty,
    })
  }

  // ✅ RETURN ALL RESULTS
  // Array of penalty data for all employees
  return results
}
