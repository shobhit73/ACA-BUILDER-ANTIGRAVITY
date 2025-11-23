/**
 * 🎯 PDF GENERATOR FOR IRS FORM 1095-C
 *
 * This file handles the generation and filling of IRS Form 1095-C PDFs.
 * Form 1095-C is used to report employer-provided health insurance offers and coverage
 * under the Affordable Care Act (ACA).
 *
 * 🔥 KEY CHALLENGES FACED:
 * 1. PDF field names are NOT simple like "firstName" - they use XFA (XML Forms Architecture)
 *    with hierarchical paths like "topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]"
 *
 * 2. The biggest struggle was discovering that Part II uses "Table1[0]" instead of "PartII[0]"
 *    in the field hierarchy. This took hours of debugging to figure out!
 *
 * 3. Had to implement field discovery to inspect the actual PDF and find the real field names
 *    because the documentation didn't match the actual PDF structure.
 *
 * 4. SSN and EIN formatting - had to add proper formatting (XXX-XX-XXXX and XX-XXXXXXX)
 *
 * 💡 LESSONS LEARNED:
 * - Always inspect the actual PDF field names first before assuming structure
 * - Use console.log debugging extensively to understand what's happening
 * - XFA forms are way more complex than regular PDF forms
 * - The IRS PDF structure is not intuitive - "Table1" for monthly data? Really? 😅
 */

import { PDFDocument, type PDFForm } from "pdf-lib"

/**
 * 📋 EMPLOYEE PDF DATA INTERFACE
 *
 * This interface defines all the data we need to fill out Form 1095-C.
 * It's structured to match the three main parts of the form:
 * - Part I: Employee and Employer information
 * - Part II: Monthly ACA codes (Line 14 and Line 16)
 * - Part III: Covered individuals
 *
 * Why this structure? Because the PDF form is organized this way, and it makes
 * mapping data from our database to PDF fields super straightforward.
 */
export interface EmployeePdfData {
  // 👤 PART I - EMPLOYEE INFO (Lines 1-6)
  // These fields appear at the top of the form
  firstName: string // Line 1: Employee's first name
  middleInitial: string // Line 1: Middle initial (just one letter)
  lastName: string // Line 1: Employee's last name
  ssn: string // Line 2: Social Security Number (will be formatted as XXX-XX-XXXX)
  address: string // Line 3: Street address (including apartment number)
  city: string // Line 4: City or town
  state: string // Line 5: State or province (2-letter code like "CA", "NY")
  zipCode: string // Line 6: ZIP code

  // 🏢 PART I - EMPLOYER INFO (Lines 7-13)
  // These fields identify the employer (Applicable Large Employer Member)
  employerName: string // Line 7: Name of employer
  ein: string // Line 8: Employer Identification Number (will be formatted as XX-XXXXXXX)
  employerAddress: string // Line 9: Employer's street address
  contactPhone: string // Line 10: Contact telephone number
  employerCity: string // Line 11: Employer's city
  employerState: string // Line 12: Employer's state
  employerZipCode: string // Line 13: Employer's ZIP code

  // 📅 PART II - MONTHLY ACA CODES (Lines 14 & 16)
  // This is an array of 12 objects (one for each month of the year)
  // Each month has two codes: line14 (offer of coverage) and line16 (safe harbor)
  monthlyCodes: {
    month: number // 1-12 (January = 1, December = 12)
    line14: string | null // Offer of Coverage code (like "1A", "1B", "1E", etc.)
    line16: string | null // Safe Harbor code (like "2C", "2F", "2H", etc.)
  }[]

  // 📋 PART III - COVERED INDIVIDUALS
  // This is an array of covered individuals (employee + dependents)
  coveredIndividuals: {
    firstName: string // First name
    middleInitial?: string // Middle initial (optional)
    lastName: string // Last name
    ssn?: string // Social Security Number (optional for dependents)
    dateOfBirth: string // Date of Birth (format: MM/DD/YYYY)
    coverageMonths: number[] // Months with coverage (1-12)
  }[]
}

/**
 * 🔍 DISCOVER PDF FIELD NAMES
 *
 * This function was a LIFESAVER during debugging!
 *
 * What it does:
 * - Takes PDF bytes as input (instead of loading from filesystem)
 * - Extracts ALL field names from the PDF
 * - Filters and logs Part II fields specifically (because those were the problematic ones)
 *
 * 🤯 Why we needed this:
 * The JSON file we had with field names didn't match the actual PDF structure.
 * We were trying to use "PartII[0]" but the PDF actually uses "Table1[0]".
 * This function helped us discover the REAL field names by inspecting the actual PDF.
 *
 * 💡 Pro tip: If you're working with ANY PDF form, write a function like this first!
 * It'll save you hours of frustration trying to guess field names.
 *
 * @param pdfBytes - The PDF file as a byte array
 * @returns Array of all field names in the PDF
 */
async function discoverPdfFieldNames(pdfBytes: Uint8Array): Promise<string[]> {
  // Parse the PDF using pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Get the form object (this contains all the fillable fields)
  const form = pdfDoc.getForm()

  // Get all fields in the form
  const fields = form.getFields()

  // Extract just the field names (we don't need the full field objects here)
  const fieldNames = fields.map((field) => field.getName())

  // Log the total count - this PDF has 306 fields! 😱
  console.log("[v0] Total fields found:", fieldNames.length)

  // Filter to find Part II fields specifically
  // We're looking for fields that contain "PartII", "Row1", "Row3", or field numbers f1_17 through f1_55
  // The regex /f1_(1[7-9]|2[0-9]|3[0-9]|4[0-9]|5[0-5])/.test(name) matches f1_17, f1_18, ... f1_55
  const partIIFields = fieldNames.filter(
    (name) =>
      name.includes("PartII") ||
      name.includes("Row1") ||
      name.includes("Row3") ||
      /f1_(1[7-9]|2[0-9]|3[0-9]|4[0-9]|5[0-5])/.test(name), // f1_17 through f1_55
  )

  // Log the Part II fields so we can see what we're working with
  console.log("[v0] Part II related fields:", partIIFields)
  console.log("[v0] Part II fields count:", partIIFields.length)

  return fieldNames
}

/**
 * 🔍 DISCOVER PART III FIELD NAMES (COVERED INDIVIDUALS)
 *
 * This function discovers the field names for Part III of Form 1095-C.
 * Part III lists all covered individuals (employee + dependents).
 */
async function discoverPartIIIFieldNames(pdfBytes: Uint8Array): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  const fieldNames = fields.map((field) => field.getName())

  console.log("[v0] ===== PART III ROW-SPECIFIC FIELD DISCOVERY =====")

  // Find all fields in Row1, Row2, Row3 and test their types
  for (let rowNum = 1; rowNum <= 3; rowNum++) {
    const rowFields = fieldNames.filter((name) => name.includes(`Row${rowNum}[0]`) && name.includes("Page3"))
    console.log(`[v0] ========== ROW ${rowNum} ANALYSIS ==========`)
    console.log(`[v0] Total fields in Row${rowNum}:`, rowFields.length)

    rowFields.forEach((fieldName) => {
      let fieldType = "UNKNOWN"
      let canFillAsText = false
      let canFillAsCheckbox = false

      // Try to access as text field
      try {
        const textField = form.getTextField(fieldName)
        fieldType = "TEXT_FIELD"
        canFillAsText = true
      } catch (e) {
        // Not a text field
      }

      // Try to access as checkbox
      try {
        const checkboxField = form.getCheckBox(fieldName)
        if (!canFillAsText) {
          fieldType = "CHECKBOX"
        }
        canFillAsCheckbox = true
      } catch (e) {
        // Not a checkbox
      }

      console.log(`[v0]   ${fieldName}`)
      console.log(`[v0]     Type: ${fieldType}`)
      console.log(`[v0]     Can fill as text: ${canFillAsText}`)
      console.log(`[v0]     Can fill as checkbox: ${canFillAsCheckbox}`)
    })
  }

  console.log("[v0] ===================================================")

  return fieldNames
}

/**
 * 🔍 LOG ALL PDF FIELDS (COMPREHENSIVE DISCOVERY)
 *
 * This function logs ALL fields in the PDF grouped by page.
 * This will help us find the actual Part III text field names.
 */
async function logAllPdfFields(pdfBytes: Uint8Array): Promise<void> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  console.log("[v0] ========================================")
  console.log("[v0] COMPREHENSIVE PDF FIELD DISCOVERY")
  console.log("[v0] ========================================")
  console.log("[v0] Total fields in PDF:", fields.length)

  // Separate fields by type
  const textFields: string[] = []
  const checkboxFields: string[] = []
  const otherFields: string[] = []

  fields.forEach((field) => {
    const name = field.getName()
    try {
      // Try to get as text field
      form.getTextField(name)
      textFields.push(name)
    } catch {
      try {
        // Try to get as checkbox
        form.getCheckBox(name)
        checkboxFields.push(name)
      } catch {
        // Neither text nor checkbox
        otherFields.push(name)
      }
    }
  })

  console.log("[v0] Text fields found:", textFields.length)
  console.log("[v0] Checkbox fields found:", checkboxFields.length)
  console.log("[v0] Other fields found:", otherFields.length)

  const page3TextFields = textFields.filter((name) => name.includes("Page3"))
  const page3CheckboxFields = checkboxFields.filter((name) => name.includes("Page3"))

  console.log("[v0] ========================================")
  console.log("[v0] PAGE 3 TEXT FIELDS (Part III Names/SSN/DOB):")
  console.log("[v0] ========================================")
  if (page3TextFields.length === 0) {
    console.log("[v0] ⚠️ NO TEXT FIELDS FOUND ON PAGE 3!")
    console.log("[v0] This PDF version may not have fillable text fields for Part III")
    console.log("[v0] Names, SSN, and DOB must be filled manually")
  } else {
    page3TextFields.forEach((name) => console.log(`[v0] TEXT: ${name}`))
  }

  console.log("[v0] ========================================")
  console.log("[v0] PAGE 3 CHECKBOX FIELDS (Part III Coverage Months):")
  console.log("[v0] ========================================")
  console.log(`[v0] Found ${page3CheckboxFields.length} checkbox fields`)
  // Only show first 20 to avoid log spam
  page3CheckboxFields.slice(0, 20).forEach((name) => console.log(`[v0] CHECKBOX: ${name}`))
  if (page3CheckboxFields.length > 20) {
    console.log(`[v0] ... and ${page3CheckboxFields.length - 20} more checkbox fields`)
  }

  console.log("[v0] ========================================")
}

/**
 * 📝 FILL FORM 1095-C (MAIN FUNCTION)
 *
 * This is the main function that does all the magic! ✨
 *
 * What it does:
 * 1. Loads the PDF from provided bytes
 * 2. Fills in employee information (Part I)
 * 3. Fills in employer information (Part I)
 * 4. Fills in monthly ACA codes (Part II)
 * 5. Fills in covered individuals (Part III)
 * 6. Flattens the form (makes it non-editable)
 * 7. Returns the filled PDF as bytes
 *
 * 🎯 Why flatten the form?
 * Flattening converts the fillable form fields into regular text/graphics.
 * This prevents users from editing the PDF after it's generated, which is
 * important for official IRS forms. It also reduces file size!
 *
 * 🔥 The biggest challenge here was getting the field paths right.
 * We had to use the full hierarchical XFA paths like:
 * "topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]"
 *
 * Not just "f1_1" or "firstName" - that would be too easy! 😅
 *
 * @param pdfBytes - The blank PDF template as a byte array
 * @param employeeData - All the employee and employer data to fill into the PDF
 * @returns PDF file as Uint8Array (byte array) ready to be downloaded
 */
export async function fillForm1095C(pdfBytes: Uint8Array, employeeData: EmployeePdfData): Promise<Uint8Array> {
  // This fixes the production error where fs module can't be used in browser-bundled code

  // Parse the PDF using pdf-lib library
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Get the form object so we can fill in the fields
  const form = pdfDoc.getForm()

  // Discover all field names (useful for debugging)
  // This helps us verify we're using the correct field paths
  const fieldNames = await discoverPdfFieldNames(pdfBytes)
  console.log("[v0] First 20 field names:", fieldNames.slice(0, 20))

  // This will help us find the correct field names for covered individuals
  await discoverPartIIIFieldNames(pdfBytes)

  // Log ALL PDF fields (Part III is on Page3)
  await logAllPdfFields(pdfBytes)

  // 👤 FILL PART I - EMPLOYEE INFORMATION (Lines 1-6)
  // All these fields are under the "EmployeeName[0]" parent in the PDF hierarchy
  // The field numbers go from f1_1 to f1_8
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]", employeeData.firstName)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_2[0]", employeeData.middleInitial)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_3[0]", employeeData.lastName)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_4[0]", formatSSN(employeeData.ssn)) // Format SSN as XXX-XX-XXXX
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_5[0]", employeeData.address)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_6[0]", employeeData.city)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_7[0]", employeeData.state)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployeeName[0].f1_8[0]", employeeData.zipCode)

  // 🏢 FILL PART I - EMPLOYER INFORMATION (Lines 7-13)
  // All these fields are under the "EmployerIssuer[0]" parent in the PDF hierarchy
  // The field numbers go from f1_9 to f1_15
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_9[0]", employeeData.employerName)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_10[0]", formatEIN(employeeData.ein)) // Format EIN as XX-XXXXXXX
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_11[0]", employeeData.employerAddress)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_12[0]", employeeData.contactPhone)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_13[0]", employeeData.employerCity)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_14[0]", employeeData.employerState)
  fillTextField(form, "topmostSubform[0].Page1[0].EmployerIssuer[0].f1_15[0]", employeeData.employerZipCode)

  // 📅 FILL PART II - MONTHLY ACA CODES (Lines 14 & 16)
  // This is handled by a separate function because it's more complex
  // We need to handle 12 months of data for two different lines
  fillMonthlyAcaCodes(form, employeeData.monthlyCodes)

  // 📋 FILL PART III - COVERED INDIVIDUALS
  // This function fills in the covered individuals data
  fillCoveredIndividuals(form, employeeData.coveredIndividuals)

  // 🔒 FLATTEN THE FORM
  // This makes the PDF non-editable and converts form fields to regular text
  // Important for official documents to prevent tampering!
  form.flatten()

  // 💾 SAVE AND RETURN THE PDF
  // Returns the PDF as a Uint8Array (byte array) that can be downloaded
  return await pdfDoc.save()
}

/**
 * 📅 FILL MONTHLY ACA CODES (Part II, Lines 14 & 16)
 *
 * This function handles the monthly data in Part II of the form.
 * It's more complex than Part I because we have to deal with:
 * - 12 months of data
 * - Two different lines (14 and 16)
 * - An "All 12 Months" field if all months have the same code
 *
 * 🎯 How it works:
 * 1. Check if all 12 months have the same code for Line 14
 * 2. If yes, fill the "All 12 Months" field (f1_17 for Line 14)
 * 3. If no, fill each individual month field (f1_18 through f1_29 for Line 14)
 * 4. Repeat the same process for Line 16 (f1_43 through f1_55)
 *
 * 🔥 THE BIG DISCOVERY:
 * These fields are under "Table1[0]" NOT "PartII[0]"!
 * This was the hardest bug to figure out. The PDF structure uses:
 * - "Table1[0].Row1[0]" for Line 14 (Offer of Coverage)
 * - "Table1[0].Row3[0]" for Line 16 (Safe Harbor)
 *
 * Why Row1 and Row3? Because Row2 is for Line 15 (Employee Required Contribution)
 * which we're not implementing yet. The IRS form has 4 rows in Part II.
 *
 * @param form - The PDF form object
 * @param monthlyCodes - Array of 12 monthly code objects
 */
function fillMonthlyAcaCodes(form: PDFForm, monthlyCodes: EmployeePdfData["monthlyCodes"]) {
  // 📊 LINE 14: OFFER OF COVERAGE CODES

  // Check if all months have the same Line 14 code
  // This is an optimization - if all months are the same, we can just fill the "All 12 Months" field
  const allLine14Same = monthlyCodes.every((m) => m.line14 === monthlyCodes[0]?.line14)

  // Check if all months have the same Line 16 code
  const allLine16Same = monthlyCodes.every((m) => m.line16 === monthlyCodes[0]?.line16)

  // Handle Line 14 (Offer of Coverage codes like "1A", "1B", "1E", etc.)
  if (allLine14Same && monthlyCodes[0]?.line14) {
    // All months have the same code, so fill the "All 12 Months" field
    // This is field f1_17 in Row1
    fillTextField(form, "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_17[0]", monthlyCodes[0].line14)
  } else {
    // Months have different codes, so we need to fill each month individually
    // Create a mapping of month number to PDF field name
    // January = f1_18, February = f1_19, ... December = f1_29
    const line14FieldMap: Record<number, string> = {
      1: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_18[0]", // January
      2: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_19[0]", // February
      3: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_20[0]", // March
      4: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_21[0]", // April
      5: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_22[0]", // May
      6: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_23[0]", // June
      7: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_24[0]", // July
      8: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_25[0]", // August
      9: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_26[0]", // September
      10: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_27[0]", // October
      11: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_28[0]", // November
      12: "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_29[0]", // December
    }

    // Loop through each month and fill its corresponding field
    monthlyCodes.forEach(({ month, line14 }) => {
      // Only fill if we have a code for this month
      if (line14 && line14FieldMap[month]) {
        fillTextField(form, line14FieldMap[month], line14)
      }
    })
  }

  // 🛡️ LINE 16: SAFE HARBOR CODES

  // Same logic as Line 14, but for Line 16 (Safe Harbor codes like "2C", "2F", "2H", etc.)
  if (allLine16Same && monthlyCodes[0]?.line16) {
    // All months have the same code, so fill the "All 12 Months" field
    // This is field f1_43 in Row3
    fillTextField(form, "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_43[0]", monthlyCodes[0].line16)
  } else {
    // Months have different codes, so we need to fill each month individually
    // Create a mapping of month number to PDF field name
    // January = f1_44, February = f1_45, ... December = f1_55
    const line16FieldMap: Record<number, string> = {
      1: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_44[0]", // January
      2: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_45[0]", // February
      3: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_46[0]", // March
      4: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_47[0]", // April
      5: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_48[0]", // May
      6: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_49[0]", // June
      7: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_50[0]", // July
      8: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_51[0]", // August
      9: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_52[0]", // September
      10: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_53[0]", // October
      11: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_54[0]", // November
      12: "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_55[0]", // December
    }

    // Loop through each month and fill its corresponding field
    monthlyCodes.forEach(({ month, line16 }) => {
      // Only fill if we have a code for this month
      if (line16 && line16FieldMap[month]) {
        fillTextField(form, line16FieldMap[month], line16)
      }
    })
  }
}

/**
 * 📋 FILL COVERED INDIVIDUALS (Part III)
 *
 * This function fills in the covered individuals section of Form 1095-C.
 * Part III lists all individuals covered under the employer's health insurance plan.
 *
 * 🔍 FIELD STRUCTURE DISCOVERED:
 * After extensive debugging, we discovered the actual field names for Part III:
 *
 * TEXT FIELDS:
 * Row 1 (Row 18 on form): f3_56 (First), f3_57 (MI), f3_58 (Last), f3_59 (SSN), f3_60 (DOB)
 * Row 2 (Row 19 on form): f3_61 (First), f3_62 (MI), f3_63 (Last), f3_64 (SSN), f3_65 (DOB)
 * Row 3 (Row 20 on form): f3_66 (First), f3_67 (MI), f3_68 (Last), f3_69 (SSN), f3_70 (DOB)
 * Pattern: Each row starts 5 fields after the previous row (56, 61, 66, 71, ...)
 *
 * CHECKBOXES:
 * Row 1: c3_3 (All 12), c3_4 (Jan), c3_5 (Feb), c3_6-c3_15 (Mar-Dec)
 * Row 2: c3_16 (All 12), c3_17 (Jan), c3_18 (Feb), c3_19-c3_28 (Mar-Dec)
 * Row 3: c3_29 (All 12), c3_30 (Jan), c3_31 (Feb), c3_32-c3_41 (Mar-Dec)
 * Pattern: Each row starts 13 fields after the previous row (3, 16, 29, ...)
 *
 * @param form - The PDF form object
 * @param coveredIndividuals - Array of covered individuals data
 */
function fillCoveredIndividuals(form: PDFForm, coveredIndividuals: EmployeePdfData["coveredIndividuals"]) {
  if (!coveredIndividuals || coveredIndividuals.length === 0) {
    console.log("[v0] No covered individuals data provided, skipping Part III")
    return
  }

  console.log(`[v0] Filling Part III with ${coveredIndividuals.length} covered individuals`)

  coveredIndividuals.forEach((person, index) => {
    // Part III can hold up to 13 rows (Row1 through Row13)
    if (index >= 13) {
      console.log(`[v0] Warning: More than 13 covered individuals. Only first 13 will be included.`)
      return
    }

    const rowNumber = index + 1
    const rowPrefix = `topmostSubform[0].Page3[0].Table_Part3[0].Row${rowNumber}[0]`

    const textFieldBaseNum = 56 + index * 5

    // Fill text fields for name, SSN, and DOB
    fillTextField(form, `${rowPrefix}.f3_${textFieldBaseNum}[0]`, person.firstName)
    fillTextField(form, `${rowPrefix}.f3_${textFieldBaseNum + 1}[0]`, person.middleInitial || "")
    fillTextField(form, `${rowPrefix}.f3_${textFieldBaseNum + 2}[0]`, person.lastName)
    fillTextField(form, `${rowPrefix}.f3_${textFieldBaseNum + 3}[0]`, person.ssn ? formatSSN(person.ssn) : "")
    fillTextField(form, `${rowPrefix}.f3_${textFieldBaseNum + 4}[0]`, person.dateOfBirth)

    const allMonthsCheckboxNum = 3 + index * 13

    // January checkbox: c3_4, c3_17, c3_30
    if (person.coverageMonths[0]) {
      fillCheckboxField(form, `${rowPrefix}.c3_${allMonthsCheckboxNum + 1}[0]`, true)
    }

    // February checkbox: c3_5, c3_18, c3_31
    if (person.coverageMonths[1]) {
      fillCheckboxField(form, `${rowPrefix}.c3_${allMonthsCheckboxNum + 2}[0]`, true)
    }

    // March through December checkboxes: c3_6-15, c3_19-28, c3_32-41
    for (let monthIndex = 2; monthIndex < Math.min(person.coverageMonths.length, 12); monthIndex++) {
      if (person.coverageMonths[monthIndex]) {
        // Map month index to checkbox:
        // monthIndex 2 (March) → c3_6, c3_19, c3_32
        // monthIndex 3 (April) → c3_7, c3_20, c3_33
        // ...
        // monthIndex 11 (December) → c3_15, c3_28, c3_41
        const checkboxNum = allMonthsCheckboxNum + 3 + (monthIndex - 2)
        fillCheckboxField(form, `${rowPrefix}.c3_${checkboxNum}[0]`, true)
      }
    }

    console.log(
      `[v0] ✅ Filled Part III Row${rowNumber} for ${person.firstName} ${person.middleInitial || ""} ${person.lastName}`,
    )
  })

  console.log("[v0] ✅ Part III filling complete - all fields filled successfully")
}

/**
 * ✍️ FILL TEXT FIELD (HELPER FUNCTION)
 *
 * This is a wrapper function around pdf-lib's getTextField() and setText() methods.
 *
 * Why wrap it?
 * 1. Error handling - If a field doesn't exist, we catch the error and log it
 * 2. Logging - We log every successful field fill for debugging
 * 3. Null safety - We handle empty/null values gracefully
 *
 * 🔥 This function saved us during debugging!
 * When fields weren't filling, the console logs showed us exactly which fields
 * were failing and which were succeeding. This helped us identify the
 * "Table1[0]" vs "PartII[0]" issue.
 *
 * @param form - The PDF form object
 * @param fieldName - The full hierarchical field name (e.g., "topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]")
 * @param value - The value to fill into the field
 */
function fillTextField(form: PDFForm, fieldName: string, value: string) {
  try {
    // Get the text field from the form using its full hierarchical name
    const field = form.getTextField(fieldName)

    // Set the text value (use empty string if value is null/undefined)
    field.setText(value || "")

    // Log success for debugging
    console.log(`[v0] Successfully filled field ${fieldName} with value: ${value}`)
  } catch (error) {
    // If the field doesn't exist or there's any error, log it
    // This was CRUCIAL for debugging - it showed us which fields were failing
    console.error(`[v0] Failed to fill field ${fieldName}:`, error)
  }
}

/**
 * ✅ FILL CHECKBOX FIELD (HELPER FUNCTION)
 *
 * This is a wrapper function around pdf-lib's getCheckBox() and check() methods.
 *
 * Why wrap it?
 * 1. Error handling - If a field doesn't exist, we catch the error and log it
 * 2. Logging - We log every successful checkbox fill for debugging
 *
 * @param form - The PDF form object
 * @param fieldName - The full hierarchical field name (e.g., "topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_6[0]")
 * @param checked - The value to set for the checkbox (true or false)
 */
function fillCheckboxField(form: PDFForm, fieldName: string, checked: boolean) {
  try {
    // Get the checkbox field from the form using its full hierarchical name
    const field = form.getCheckBox(fieldName)

    // Set the checkbox value
    if (checked) {
      field.check()
    } else {
      field.uncheck()
    }

    // Log success for debugging
    console.log(`[v0] Successfully filled checkbox field ${fieldName} with value: ${checked}`)
  } catch (error) {
    // If the field doesn't exist or there's any error, log it
    console.error(`[v0] Failed to fill checkbox field ${fieldName}:`, error)
  }
}

/**
 * 🔢 FORMAT SSN (SOCIAL SECURITY NUMBER)
 *
 * Formats SSN as XXX-XX-XXXX (standard IRS format)
 *
 * Example:
 * Input: "123456789" or "123-45-6789"
 * Output: "123-45-6789"
 *
 * Why do we need this?
 * - Database might store SSN without dashes (just 9 digits)
 * - IRS forms expect the dashed format
 * - Users might enter SSN with or without dashes
 *
 * How it works:
 * 1. Remove all non-digit characters using regex /\D/g
 * 2. Check if we have exactly 9 digits
 * 3. If yes, format as XXX-XX-XXXX
 * 4. If no, return the original value (might be empty or invalid)
 *
 * @param ssn - SSN string (with or without dashes)
 * @returns Formatted SSN as XXX-XX-XXXX
 */
function formatSSN(ssn: string): string {
  // Remove all non-digit characters (dashes, spaces, etc.)
  const cleaned = ssn.replace(/\D/g, "")

  // Check if we have exactly 9 digits
  if (cleaned.length === 9) {
    // Format as XXX-XX-XXXX
    // slice(0, 3) = first 3 digits
    // slice(3, 5) = next 2 digits
    // slice(5) = last 4 digits
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
  }

  // If not 9 digits, return original value
  // This handles empty strings, partial SSNs, etc.
  return ssn
}

/**
 * 🏢 FORMAT EIN (EMPLOYER IDENTIFICATION NUMBER)
 *
 * Formats EIN as XX-XXXXXXX (standard IRS format)
 *
 * Example:
 * Input: "123456789" or "12-3456789"
 * Output: "12-3456789"
 *
 * Why do we need this?
 * - Database might store EIN without dashes (just 9 digits)
 * - IRS forms expect the dashed format
 * - Similar to SSN formatting but different pattern
 *
 * How it works:
 * 1. Remove all non-digit characters using regex /\D/g
 * 2. Check if we have exactly 9 digits
 * 3. If yes, format as XX-XXXXXXX
 * 4. If no, return the original value
 *
 * @param ein - EIN string (with or without dashes)
 * @returns Formatted EIN as XX-XXXXXXX
 */
function formatEIN(ein: string): string {
  // Remove all non-digit characters (dashes, spaces, etc.)
  const cleaned = ein.replace(/\D/g, "")

  // Check if we have exactly 9 digits
  if (cleaned.length === 9) {
    // Format as XX-XXXXXXX
    // slice(0, 2) = first 2 digits
    // slice(2) = last 7 digits
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`
  }

  // If not 9 digits, return original value
  return ein
}
