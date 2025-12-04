import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PDFDocument } from "pdf-lib"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const companyCode = searchParams.get("companyCode")
        const taxYear = searchParams.get("taxYear")
        const employeeId = searchParams.get("employeeId")

        console.log(`[PDF API] Request received: Company=${companyCode}, Year=${taxYear}, EmpID=${employeeId}`)

        if (!companyCode || !taxYear || !employeeId) {
            console.error("[PDF API] Missing parameters")
            return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Fetch Company Details
        console.log("[PDF API] Fetching company details...")
        const { data: company, error: companyError } = await supabase
            .from("company_details")
            .select("*")
            .eq("company_code", companyCode)
            .single()

        if (companyError || !company) {
            console.error("[PDF API] Company error:", companyError)
            return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 })
        }

        // 2. Fetch Employee Census
        console.log("[PDF API] Fetching employee census...")
        const { data: employee, error: empError } = await supabase
            .from("employee_census")
            .select("*")
            .eq("company_code", companyCode)
            .eq("employee_id", employeeId)
            .single()

        if (empError || !employee) {
            console.error("[PDF API] Employee error:", empError)
            return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
        }

        // RBAC Check: Ensure user is authorized to view this employee
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const isSuperAdmin = user.user_metadata.role === "super_admin"
        if (!isSuperAdmin) {
            // Regular users can only download their own PDF
            if (!employee.email || employee.email.toLowerCase() !== user.email?.toLowerCase()) {
                console.warn(`[PDF API] Unauthorized access attempt by ${user.email} for employee ${employeeId}`)
                return NextResponse.json({ success: false, error: "Forbidden: You can only access your own documents" }, { status: 403 })
            }
        }

        // 3. Fetch Employee Address
        console.log("[PDF API] Fetching employee address...")
        const { data: address } = await supabase
            .from("employee_address")
            .select("*")
            .eq("company_code", companyCode)
            .eq("employee_id", employeeId)
            .single()

        // 4. Fetch ACA Final Report (12 months)
        console.log("[PDF API] Fetching ACA records...")
        const { data: acaRecords, error: acaError } = await supabase
            .from("aca_final_report")
            .select("*")
            .eq("company_code", companyCode)
            .eq("employee_id", employeeId)
            .eq("tax_year", parseInt(taxYear))
            .order("month", { ascending: true })

        if (acaError) {
            console.error("[PDF API] ACA records error:", acaError)
            return NextResponse.json({ success: false, error: "ACA data not found" }, { status: 404 })
        }

        // 5. Fetch Dependents for Part III
        console.log("[PDF API] Fetching dependents...")
        const { data: dependents } = await supabase
            .from("employee_dependent")
            .select("*")
            .eq("company_code", companyCode)
            .eq("employee_id", employeeId)

        // 6. Load PDF Template
        console.log("[PDF API] Loading PDF template...")
        const pdfPath = path.join(process.cwd(), "public", "forms", "f1095c.pdf")
        if (!fs.existsSync(pdfPath)) {
            console.error(`[PDF API] Template not found at: ${pdfPath}`)
            return NextResponse.json({ success: false, error: "PDF template not found" }, { status: 500 })
        }
        const pdfBytes = fs.readFileSync(pdfPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)
        const form = pdfDoc.getForm()

        console.log("[PDF API] Filling Part I...")
        // ====================
        // PART I: EMPLOYEE INFO
        // ====================
        try {
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_1[0]").setText(employee.first_name || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_2[0]").setText(employee.middle_initial || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_3[0]").setText(employee.last_name || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_4[0]").setText(employee.ssn || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_5[0]").setText(address?.street_address || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_6[0]").setText(address?.city || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_7[0]").setText(address?.state || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployeeName[0].f1_8[0]").setText(address?.zip_code || "")
        } catch (err) {
            console.error("[PDF] Error filling employee info:", err)
        }

        // ====================
        // PART I: EMPLOYER INFO
        // ====================
        try {
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_9[0]").setText(company.company_name || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_10[0]").setText(company.ein || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_11[0]").setText(company.company_address || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_12[0]").setText(company.contact_phone || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_13[0]").setText(company.company_city || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_14[0]").setText(company.company_state || "")
            form.getTextField("topmostSubform[0].Page1[0].EmployerIssuer[0].f1_15[0]").setText(company.company_zip || "")
        } catch (err) {
            console.error("[PDF] Error filling employer info:", err)
        }

        console.log("[PDF API] Filling Part II...")
        // ====================
        // PART II: MONTHLY CODES
        // ====================
        // Create a map for quick lookup by month
        const monthData: any = {}
        acaRecords?.forEach((record: any) => {
            monthData[record.month] = record
        })

        // Line 14 - Offer of Coverage
        const line14Fields = [
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_17[0]", // All 12
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_18[0]", // Jan
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_19[0]", // Feb
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_20[0]", // Mar
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_21[0]", // Apr
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_22[0]", // May
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_23[0]", // Jun
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_24[0]", // Jul
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_25[0]", // Aug
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_26[0]", // Sep
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_27[0]", // Oct
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_28[0]", // Nov
            "topmostSubform[0].Page1[0].Table1[0].Row1[0].f1_29[0]", // Dec
        ]

        for (let i = 1; i <= 12; i++) {
            const data = monthData[i]
            if (data?.line_14_code) {
                try {
                    form.getTextField(line14Fields[i]).setText(data.line_14_code)
                } catch (e) { console.warn(`Field not found: ${line14Fields[i]}`) }
            }
        }

        // Line 15 - Employee Required Contribution
        const line15Fields = [
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_30[0]", // All 12
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_31[0]", // Jan
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_32[0]", // Feb
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_33[0]", // Mar
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_34[0]", // Apr
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_35[0]", // May
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_36[0]", // Jun
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_37[0]", // Jul
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_38[0]", // Aug
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_39[0]", // Sep
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_40[0]", // Oct
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_41[0]", // Nov
            "topmostSubform[0].Page1[0].Table1[0].Row2[0].f1_42[0]", // Dec
        ]

        for (let i = 1; i <= 12; i++) {
            const data = monthData[i]
            if (data?.line_15_cost) {
                try {
                    form.getTextField(line15Fields[i]).setText(data.line_15_cost.toFixed(2))
                } catch (e) { console.warn(`Field not found: ${line15Fields[i]}`) }
            }
        }

        // Line 16 - Safe Harbor Codes
        const line16Fields = [
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_43[0]", // All 12
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_44[0]", // Jan
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_45[0]", // Feb
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_46[0]", // Mar
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_47[0]", // Apr
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_48[0]", // May
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_49[0]", // Jun
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_50[0]", // Jul
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_51[0]", // Aug
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_52[0]", // Sep
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_53[0]", // Oct
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_54[0]", // Nov
            "topmostSubform[0].Page1[0].Table1[0].Row3[0].f1_55[0]", // Dec
        ]

        for (let i = 1; i <= 12; i++) {
            const data = monthData[i]
            if (data?.line_16_code) {
                try {
                    form.getTextField(line16Fields[i]).setText(data.line_16_code)
                } catch (e) { console.warn(`Field not found: ${line16Fields[i]}`) }
            }
        }

        console.log("[PDF API] Filling Part III...")
        // ====================
        // PART III: COVERED INDIVIDUALS (Dependents)
        // ====================
        if (dependents && dependents.length > 0) {
            try {
                // Check self-insured box if applicable
                form.getCheckBox("topmostSubform[0].Page3[0].PartIII[0].c1_2[0]").check()

                // Fill up to 13 rows (Lines 18-30)
                const rowMappings = [
                    { row: "Row1", f: "f3_56", c: "c3_3" },
                    { row: "Row2", f: "f3_61", c: "c3_16" },
                    { row: "Row3", f: "f3_66", c: "c3_29" },
                    { row: "Row4", f: "f3_71", c: "c3_42" },
                    { row: "Row5", f: "f3_76", c: "c3_55" },
                    { row: "Row6", f: "f3_81", c: "c3_68" },
                    { row: "Row7", f: "f3_86", c: "c3_81" },
                    { row: "Row8", f: "f3_91", c: "c3_94" },
                    { row: "Row9", f: "f3_96", c: "c3_107" },
                    { row: "Row10", f: "f3_101", c: "c3_120" },
                    { row: "Row11", f: "f3_106", c: "c3_133" },
                    { row: "Row12", f: "f3_111", c: "c3_146" },
                    { row: "Row13", f: "f3_116", c: "c3_159" },
                ]

                console.log(`[PDF API] Found ${dependents.length} dependents for ${employeeId}`)
                dependents.slice(0, 13).forEach((dep: any, index: number) => {
                    console.log(`[PDF API] Processing dependent ${index}:`, dep.first_name, dep.last_name, "SSN:", dep.ssn)
                    const mapping = rowMappings[index]
                    const baseNum = parseInt(mapping.f.replace("f3_", ""))
                    const baseCheckNum = parseInt(mapping.c.replace("c3_", ""))

                    // Name fields
                    try {
                        form.getTextField(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].f3_${baseNum}[0]`).setText(dep.first_name || "")
                        form.getTextField(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].f3_${baseNum + 1}[0]`).setText(dep.middle_initial || "")
                        form.getTextField(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].f3_${baseNum + 2}[0]`).setText(dep.last_name || "")
                        form.getTextField(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].f3_${baseNum + 3}[0]`).setText(dep.ssn || "")
                        form.getTextField(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].f3_${baseNum + 4}[0]`).setText(dep.date_of_birth || "")

                        // Check "All 12 Months" checkbox (assuming covered all year)
                        form.getCheckBox(`topmostSubform[0].Page3[0].Table_Part3[0].${mapping.row}[0].c3_${baseCheckNum}[0]`).check()
                    } catch (e) { console.warn(`Part III field error row ${index}:`, e) }
                })
            } catch (e) {
                console.error("[PDF API] Part III error:", e)
            }
        }

        console.log("[PDF API] Flattening and saving...")
        // Flatten and save
        form.flatten()
        const pdfBytesOutput = await pdfDoc.save()

        console.log(`[PDF API] Success! Generated ${pdfBytesOutput.length} bytes`)
        // Return PDF
        return new NextResponse(Buffer.from(pdfBytesOutput), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="1095C_${employeeId}_${taxYear}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error("[PDF 1095-C] Critical Error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
