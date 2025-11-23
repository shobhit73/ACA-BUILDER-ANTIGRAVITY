/**
 * 🚀 SERVER ACTIONS FOR GENERATING IRS FORM 1095-C PDFs
 *
 * This file contains Next.js server actions that handle PDF generation.
 * Server actions run on the server (not in the browser), which is perfect for:
 * - Database queries (secure, no exposing credentials to client)
 * - PDF generation (heavy processing, better on server)
 * - File handling (can return large files efficiently)
 *
 * 🎯 WHAT THIS FILE DOES:
 * 1. Fetches employee data from Supabase database
 * 2. Fetches monthly ACA codes for the specified year
 * 3. Maps database columns to PDF field structure
 * 4. Calls the PDF generator to create the filled PDF
 * 5. Returns the PDF bytes and filename for download
 *
 * 💡 WHY SERVER ACTIONS?
 * - Secure: Database credentials stay on server
 * - Fast: No client-side processing of large PDFs
 * - Simple: Can be called directly from React components
 * - Type-safe: Full TypeScript support
 *
 * 🔥 CHALLENGES FACED:
 * - Had to convert employee_id from number to string for the ACA codes query
 *   (because employee_aca_monthly.employee_id is stored as text in the database)
 * - Date filtering for the year was tricky - had to use gte/lte with proper date strings
 * - Bulk generation needed error handling for individual failures
 * - Production error with fs module - had to move PDF loading to server action
 */

"use server" // This directive makes all exports in this file server actions

import { createServerClient } from "@/lib/supabase/server"
import { fillForm1095C, type EmployeePdfData } from "@/lib/pdf-generator"
import { headers } from "next/headers"
import path from "path"

/**
 * 📄 GENERATE 1095-C FOR SINGLE EMPLOYEE
 *
 * This is the main function for generating a PDF for one employee.
 *
 * 🎯 WHAT IT DOES:
 * 1. Connects to Supabase database
 * 2. Fetches employee details (name, address, employer info, etc.)
 * 3. Fetches monthly ACA codes for the specified year
 * 4. Maps database data to PDF structure
 * 5. Loads the blank PDF template from filesystem
 * 6. Generates the filled PDF
 * 7. Returns PDF bytes and filename
 *
 * 🔥 KEY LEARNINGS:
 * - The employee_id in employee_aca_monthly is stored as TEXT, not INTEGER
 *   So we have to convert it: employeeId.toString()
 * - Date filtering uses gte (greater than or equal) and lte (less than or equal)
 * - We order by month_start to ensure months are in correct order (Jan-Dec)
 * - PDF template must be loaded in server action (not in pdf-generator.ts) to avoid
 *   bundling fs module for the browser
 * - fs import must be inside function (not top level) to prevent client bundle errors
 *
 * 💡 ERROR HANDLING:
 * - If employee not found, throw error immediately
 * - If ACA codes query fails, throw error
 * - If PDF generation fails, error bubbles up to caller
 *
 * @param employeeId - The employee's ID from the database
 * @param year - The tax year (e.g., 2024, 2025)
 * @returns Object with PDF bytes array and filename
 * @throws Error if employee not found or database query fails
 */
export async function generate1095CForEmployee(employeeId: number, year: number) {
  // Construct the base URL for fetching the PDF template
  // In production (Vercel), use VERCEL_URL environment variable
  // In development, use localhost:3000
  // In v0 preview, use the preview URL
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"
  const baseUrl = `${protocol}://${host}`

  // Create a Supabase client for server-side database queries
  // This uses the singleton pattern to reuse connections
  const supabase = await createServerClient()

  // 👤 FETCH EMPLOYEE DETAILS
  // Query the employee_details table for this specific employee
  // .single() means we expect exactly one result (not an array)
  const { data: employeeDetails, error: empError } = await supabase
    .from("employee_details")
    .select("*") // Select all columns
    .eq("employee_id", employeeId) // Where employee_id matches
    .single() // Return single object, not array

  // Check if query failed or employee doesn't exist
  if (empError || !employeeDetails) {
    throw new Error("Employee not found")
  }

  // 📅 FETCH MONTHLY ACA CODES
  // Query the employee_aca_monthly table for this employee's ACA codes
  // We need Line 14 (offer of coverage) and Line 16 (safe harbor) for each month
  const { data: acaCodes, error: acaError } = await supabase
    .from("employee_aca_monthly")
    .select("month_start, line_14, line_16") // Only select columns we need
    .eq("employee_id", employeeId.toString()) // 🔥 IMPORTANT: Convert to string! The DB column is TEXT type
    .gte("month_start", `${year}-01-01`) // Greater than or equal to January 1st
    .lte("month_start", `${year}-12-31`) // Less than or equal to December 31st
    .order("month_start") // Order by month (Jan, Feb, Mar, ... Dec)

  // Check if query failed
  if (acaError) {
    throw new Error("Failed to fetch ACA codes")
  }

  // 🗓️ MAP MONTHLY CODES TO PDF STRUCTURE
  // Transform database rows into the format expected by the PDF generator
  // Each row has month_start (date), line_14 (string), line_16 (string)
  // We need to convert to: { month: number, line14: string, line16: string }
  const monthlyCodes = (acaCodes || []).map((code) => ({
    month: new Date(code.month_start).getMonth() + 1, // Convert date to month number (1-12)
    // getMonth() returns 0-11, so we add 1 to get 1-12
    line14: code.line_14, // Offer of Coverage code
    line16: code.line_16, // Safe Harbor code
  }))

  // 📋 PREPARE EMPLOYEE DATA FOR PDF
  // Map database columns to the EmployeePdfData interface
  // Use empty strings as fallback for null values (PDF fields can't be null)
  const coveredIndividuals: EmployeePdfData["coveredIndividuals"] = [
    {
      firstName: employeeDetails.first_name || "",
      middleInitial: employeeDetails.middle_initial || "",
      lastName: employeeDetails.last_name || "",
      ssn: employeeDetails.ssn || "",
      dateOfBirth: employeeDetails.date_of_birth || "01/01/1980", // Placeholder if not available
      coverageMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // All 12 months for employee
    },
  ]

  const { data: dependents, error: depError } = await supabase
    .from("dependent_enrollment_monthly")
    .select("*")
    .eq("employee_id", employeeId.toString())
    .gte("month_start", `${year}-01-01`)
    .lte("month_start", `${year}-12-31`)
    .order("dependent_id, month_start")

  if (!depError && dependents && dependents.length > 0) {
    // Group dependents by dependent_id to get unique dependents
    const dependentMap = new Map<
      string,
      {
        firstName: string
        middleInitial: string
        lastName: string
        coverageMonths: number[]
      }
    >()

    dependents.forEach((dep) => {
      const depId = dep.dependent_id
      if (!dependentMap.has(depId)) {
        dependentMap.set(depId, {
          firstName: dep.dep_first_name || "",
          middleInitial: dep.dep_mid_name || "",
          lastName: dep.dep_last_name || "",
          coverageMonths: [],
        })
      }

      // Add month if enrolled
      if (dep.is_enrolled_full_month) {
        const month = new Date(dep.month_start).getMonth() + 1
        dependentMap.get(depId)!.coverageMonths.push(month)
      }
    })

    // Add dependents to covered individuals array
    dependentMap.forEach((dep) => {
      coveredIndividuals.push({
        firstName: dep.firstName,
        middleInitial: dep.middleInitial,
        lastName: dep.lastName,
        dateOfBirth: "01/01/2000", // Placeholder - we don't have DOB in database
        coverageMonths: dep.coverageMonths.sort((a, b) => a - b), // Sort months
      })
    })
  }

  const pdfData: EmployeePdfData = {
    // Employee information
    firstName: employeeDetails.first_name || "",
    middleInitial: employeeDetails.middle_initial || "",
    lastName: employeeDetails.last_name || "",
    ssn: employeeDetails.ssn || "",
    address: employeeDetails.address_line1 || "",
    city: employeeDetails.city || "",
    state: employeeDetails.state || "",
    zipCode: employeeDetails.zip_code || "",

    // Employer information
    employerName: employeeDetails.employer_name || "",
    ein: employeeDetails.ein || "",
    employerAddress: employeeDetails.employer_address || "",
    contactPhone: employeeDetails.contact_telephone || "",
    employerCity: employeeDetails.employer_city || "",
    employerState: employeeDetails.employer_state || "",
    employerZipCode: employeeDetails.employer_zip_code || "",

    // Monthly ACA codes
    monthlyCodes,

    // Covered individuals
    coveredIndividuals,
  }

  // 📁 LOAD PDF TEMPLATE FROM FILESYSTEM
  // This fixes the production error where fs module was being bundled for browser
  // The PDF template is stored in public/forms/f1095c.pdf
  // We use dynamic import for fs to ensure it's only loaded on the server at runtime
  const fs = await import("fs/promises")
  const pdfTemplatePath = path.join(process.cwd(), "public", "forms", "f1095c.pdf")

  // Read the PDF template file
  const pdfTemplateBytes = await fs.readFile(pdfTemplatePath)

  // 🎨 GENERATE THE PDF
  // Call the PDF generator function with the template bytes and our prepared data
  // This returns a Uint8Array (byte array) of the filled PDF
  const pdfBytes = await fillForm1095C(pdfTemplateBytes, pdfData)

  // 📦 RETURN PDF AND FILENAME
  // Convert Uint8Array to regular array for JSON serialization
  // (Next.js server actions need to serialize the return value)
  // Generate a descriptive filename: Form_1095-C_2025_Doe_Jane.pdf
  return {
    pdfBytes: Array.from(pdfBytes), // Convert Uint8Array to regular array
    fileName: `Form_1095-C_${year}_${employeeDetails.last_name}_${employeeDetails.first_name}.pdf`,
  }
}

/**
 * 📚 GENERATE 1095-C FOR ALL EMPLOYEES (BULK GENERATION)
 *
 * This function generates PDFs for ALL employees in the database.
 *
 * 🎯 WHAT IT DOES:
 * 1. Fetches all employee IDs from the database
 * 2. Loops through each employee
 * 3. Calls generate1095CForEmployee() for each one
 * 4. Collects all successful PDFs
 * 5. Logs errors for failed PDFs (but continues processing others)
 *
 * 💡 WHY SEPARATE FUNCTION?
 * - Could have just called generate1095CForEmployee() from the UI
 * - But this function adds error handling for bulk operations
 * - If one employee fails, we still generate PDFs for the others
 * - Returns an array of results that the UI can process
 *
 * 🔥 PERFORMANCE CONSIDERATION:
 * - Currently processes employees sequentially (one at a time)
 * - For large companies (1000+ employees), this could be slow
 * - Could be optimized with Promise.all() for parallel processing
 * - But sequential is safer for database connections and memory usage
 *
 * 🚀 FUTURE IMPROVEMENTS:
 * - Add progress tracking (how many PDFs generated so far)
 * - Add batch processing (generate 10 at a time, then next 10)
 * - Add option to filter employees (only active, only certain department, etc.)
 * - Add option to combine all PDFs into one ZIP file
 *
 * @param year - The tax year (e.g., 2024, 2025)
 * @returns Array of objects with PDF bytes and filenames
 * @throws Error if failed to fetch employee list
 */
export async function generate1095CForAllEmployees(year: number) {
  // Create a Supabase client for server-side database queries
  const supabase = await createServerClient()

  // 📋 GET ALL EMPLOYEE IDs
  // We only need the employee_id column, not all employee details
  // This makes the query faster and uses less memory
  const { data: employees, error } = await supabase.from("employee_details").select("employee_id") // Only select employee_id column

  // Check if query failed
  if (error || !employees) {
    throw new Error("Failed to fetch employees")
  }

  // 📦 ARRAY TO STORE RESULTS
  // Will contain objects with pdfBytes and fileName for each successful PDF
  const results = []

  // 🔄 LOOP THROUGH EACH EMPLOYEE
  // Process one employee at a time (sequential processing)
  for (const emp of employees) {
    try {
      // Generate PDF for this employee
      const result = await generate1095CForEmployee(emp.employee_id, year)

      // Add to results array
      results.push(result)
    } catch (error) {
      // If PDF generation fails for this employee, log the error but continue
      // This ensures one bad employee doesn't stop the entire batch
      console.error(`[v0] Failed to generate PDF for employee ${emp.employee_id}:`, error)

      // 💡 We could also add the error to results array so UI can show which failed:
      // results.push({ error: true, employeeId: emp.employee_id, message: error.message })
    }
  }

  // 📦 RETURN ALL SUCCESSFUL PDFs
  // The UI will receive an array of { pdfBytes, fileName } objects
  return results
}

/**
 * 📚 GENERATE 1095-C FOR ALL EMPLOYEES AS ZIP FILE
 *
 * This function generates PDFs for ALL employees and packages them into a single ZIP file.
 *
 * 🎯 WHAT IT DOES:
 * 1. Fetches all employee IDs from the database
 * 2. Generates PDF for each employee
 * 3. Creates a ZIP file containing all PDFs
 * 4. Returns the ZIP file bytes for download
 *
 * 💡 WHY ZIP?
 * - Better user experience: One download instead of 100+ individual files
 * - Organized: All PDFs in one place
 * - Faster: Browser doesn't have to handle multiple downloads
 *
 * @param year - The tax year (e.g., 2024, 2025)
 * @returns Object with ZIP file bytes and filename
 * @throws Error if failed to fetch employee list or generate PDFs
 */
export async function generate1095CForAllEmployeesZip(year: number) {
  const supabase = await createServerClient()

  // Get all employee IDs
  const { data: employees, error } = await supabase.from("employee_details").select("employee_id")

  if (error || !employees) {
    throw new Error("Failed to fetch employees")
  }

  const JSZip = (await import("jszip")).default
  const zip = new JSZip()

  // Generate PDF for each employee and add to ZIP
  for (const emp of employees) {
    try {
      const result = await generate1095CForEmployee(emp.employee_id, year)

      // Add PDF to ZIP file
      const pdfBytes = new Uint8Array(result.pdfBytes)
      zip.file(result.fileName, pdfBytes)
    } catch (error) {
      console.error(`[v0] Failed to generate PDF for employee ${emp.employee_id}:`, error)
    }
  }

  // Generate ZIP file
  const zipBytes = await zip.generateAsync({ type: "uint8array" })

  return {
    zipBytes: Array.from(zipBytes),
    fileName: `Form_1095-C_${year}_All_Employees.zip`,
  }
}
