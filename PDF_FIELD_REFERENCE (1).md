# IRS Form 1095-C - Complete PDF Field Reference

## Field Discovery Method

To discover field names in any PDF form:

\`\`\`typescript
import { PDFDocument } from 'pdf-lib'

async function discoverPDFFields(pdfPath: string) {
  const pdfBytes = await fetch(pdfPath).then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  
  console.log(`Total fields: ${fields.length}`)
  fields.forEach((field, index) => {
    console.log(`${index + 1}. ${field.getName()}`)
  })
}
\`\`\`

## Complete Field List for IRS Form 1095-C (2024)

### Page 1 - Part I & Part II

#### Checkboxes (Top of Form)
\`\`\`
topmostSubform[0].Page1[0].c1_1[0]  // VOID checkbox
topmostSubform[0].Page1[0].c1_1[1]  // CORRECTED checkbox
\`\`\`

#### Part I: Employee Information (EmployeeName Parent)
\`\`\`
topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]   // First Name
topmostSubform[0].Page1[0].EmployeeName[0].f1_2[0]   // Middle Initial
topmostSubform[0].Page1[0].EmployeeName[0].f1_3[0]   // Last Name
topmostSubform[0].Page1[0].EmployeeName[0].f1_4[0]   // SSN
topmostSubform[0].Page1[0].EmployeeName[0].f1_5[0]   // Street Address
topmostSubform[0].Page1[0].EmployeeName[0].f1_6[0]   // City
topmostSubform[0].Page1[0].EmployeeName[0].f1_7[0]   // State
topmostSubform[0].Page1[0].EmployeeName[0].f1_8[0]   // ZIP Code
\`\`\`

#### Part I: Employer Information (EmployerIssuer Parent)
\`\`\`
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_9[0]    // Employer Name
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_10[0]   // EIN
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_11[0]   // Employer Address
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_12[0]   // Contact Phone
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_13[0]   // Employer City
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_14[0]   // Employer State
topmostSubform[0].Page1[0].EmployerIssuer[0].f1_15[0]   // Employer ZIP
\`\`\`

#### Part II: Employee Age & Plan Start Month
\`\`\`
topmostSubform[0].Page1[0].PartII[0].f1_16[0]  // Employee Age on Jan 1 & Plan Start Month
\`\`\`

#### Part II: Line 14 - Offer of Coverage (Table1 > Row1)
\`\`\`
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_17[0]   // All 12 Months
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_18[0]   // January
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_19[0]   // February
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_20[0]   // March
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_21[0]   // April
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_22[0]   // May
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_23[0]   // June
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_24[0]   // July
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_25[0]   // August
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_26[0]   // September
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_27[0]   // October
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_28[0]   // November
topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_29[0]   // December
\`\`\`

#### Part II: Line 15 - Employee Required Contribution (Table1 > Row2)
\`\`\`
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_30[0]   // All 12 Months
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_31[0]   // January
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_32[0]   // February
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_33[0]   // March
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_34[0]   // April
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_35[0]   // May
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_36[0]   // June
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_37[0]   // July
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_38[0]   // August
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_39[0]   // September
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_40[0]   // October
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_41[0]   // November
topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_42[0]   // December
\`\`\`

#### Part II: Line 16 - Safe Harbor Codes (Table1 > Row3)
\`\`\`
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_43[0]   // All 12 Months
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_44[0]   // January
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_45[0]   // February
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_46[0]   // March
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_47[0]   // April
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_48[0]   // May
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_49[0]   // June
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_50[0]   // July
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_51[0]   // August
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_52[0]   // September
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_53[0]   // October
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_54[0]   // November
topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_55[0]   // December
\`\`\`

#### Part II: Line 17 - ZIP Code (Table1 > Row4)
\`\`\`
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_56[0]   // All 12 Months
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_57[0]   // January
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_58[0]   // February
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_59[0]   // March
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_60[0]   // April
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_61[0]   // May
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_62[0]   // June
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_63[0]   // July
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_64[0]   // August
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_65[0]   // September
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_66[0]   // October
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_67[0]   // November
topmostSubform[0].Page1[0].Table1[0].Row4[0].f1_68[0]   // December
\`\`\`

### Page 3 - Part III (Covered Individuals)

#### Self-Insured Checkbox
\`\`\`
topmostSubform[0].Page3[0].c1_2[0]  // Self-insured coverage checkbox
\`\`\`

#### Part III: Covered Individuals (Lines 18-30)
Each row has the same structure. Example for Row 1 (Line 18):

\`\`\`
// Row 1 - Line 18
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].f3_56[0]   // First Name
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].f3_57[0]   // Middle Initial
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].f3_58[0]   // Last Name
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].f3_59[0]   // SSN/TIN
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].f3_60[0]   // DOB
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_3[0]    // Covered all 12 months
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_4[0]    // January
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_5[0]    // February
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_6[0]    // March
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_7[0]    // April
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_8[0]    // May
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_9[0]    // June
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_10[0]   // July
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_11[0]   // August
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_12[0]   // September
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_13[0]   // October
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_14[0]   // November
topmostSubform[0].Page3[0].Table_Part3[0].Row1[0].c3_15[0]   // December
\`\`\`

**Pattern for Rows 2-13 (Lines 19-30):**
- Replace `Row1` with `Row2`, `Row3`, etc.
- Field numbers increment: `f3_61-65` for Row2, `f3_66-70` for Row3, etc.
- Checkbox numbers increment: `c3_16-28` for Row2, `c3_29-41` for Row3, etc.

---

## Field Type Reference

### Text Fields
- All `f1_X[0]` and `f3_X[0]` fields are text input fields
- Maximum character limits vary by field
- Use `.setText(value)` method to fill

### Checkboxes
- All `c1_X[0]` and `c3_X[0]` fields are checkboxes
- Use `.check()` to mark as checked
- Use `.uncheck()` to mark as unchecked

---

## Usage Example

\`\`\`typescript
import { PDFDocument } from 'pdf-lib'

async function fillForm(data: any) {
  const pdfBytes = await fetch('/forms/f1095c.pdf').then(r => r.arrayBuffer())
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  
  // Fill employee name
  form.getTextField('topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]')
    .setText(data.firstName)
  
  // Fill Line 14 January code
  form.getTextField('topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_18[0]')
    .setText(data.januaryCode)
  
  // Check CORRECTED box
  form.getCheckBox('topmostSubform[0].Page1[0].c1_1[1]')
    .check()
  
  // Flatten and save
  form.flatten()
  return await pdfDoc.save()
}
\`\`\`

---

**Document Version:** 1.0  
**Form Year:** 2024  
**Total Fields:** 306
