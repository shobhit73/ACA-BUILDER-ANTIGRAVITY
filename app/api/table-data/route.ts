import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Define searchable columns for specific tables to avoid "column does not exist" errors
const SEARCHABLE_COLUMNS: Record<string, string[]> = {
    "employee_census": ["employee_id", "first_name", "last_name", "email"],
    "company_details": ["company_code", "company_name"],
    "plan_master": ["plan_id", "plan_name"],
    "plan_enrollment_cost": ["plan_id"], // likely keys
    "employee_plan_enrollment": ["employee_id"],
    "aca_employee_monthly_status": ["employee_id"],
    "aca_employee_monthly_offer": ["employee_id"],
    "aca_employee_monthly_enrollment": ["employee_id"],
    "employee_address": ["employee_id", "address_line_1", "city"],
    "employee_waiting_period": ["employee_id"],
    "employee_dependent": ["employee_id", "first_name", "last_name"],
    "employee_plan_eligibility": ["employee_id"],
    "payroll_hours": ["employee_id"],
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const tableName = searchParams.get("table")
        const page = parseInt(searchParams.get("page") || "1")
        const pageSize = parseInt(searchParams.get("pageSize") || "50")

        // Filter params
        const companyCode = searchParams.get("company_code")
        const year = searchParams.get("year")
        const search = searchParams.get("search")

        if (!tableName) {
            return NextResponse.json({ success: false, error: "Table name is required" }, { status: 400 })
        }

        const supabase = await createClient()

        // Calculate offset
        const offset = (page - 1) * pageSize

        // Start building query
        let query = supabase
            .from(tableName)
            .select("*", { count: "exact" })

        // Apply filters if provided
        if (companyCode) {
            query = query.eq("company_code", companyCode)
        }

        // Only apply year filter to tables that clearly have a tax_year or similar, 
        // OR better yet, let's wrap it in an ignore-if-missing logic if possible, 
        // but Supabase/Postgres throws if column invalid. 
        // Safer: Only apply if table is one of the ACA report tables or explicitly known to have tax_year.
        // Checking schema: aca_final_report, aca_limit_... might have it. 
        // company_details definitely does NOT.
        const TABLES_WITH_TAX_YEAR = ["aca_final_report", "aca_employee_monthly_status", "aca_employee_monthly_offer", "aca_employee_monthly_enrollment", "aca_penalty_report"]

        /*
        if (year && TABLES_WITH_TAX_YEAR.includes(tableName)) {
            query = query.eq("tax_year", year)
        }
        */

        if (search) {
            // Determine which columns to search based on table name
            const columnsToSearch = SEARCHABLE_COLUMNS[tableName] ||
                (tableName.includes("employee") || tableName.includes("aca")
                    ? ["employee_id"]
                    : ["id"]); // Fallback

            // Construct OR query: "col1.ilike.%search%,col2.ilike.%search%"
            const orQuery = columnsToSearch
                .map(col => `${col}.ilike.%${search}%`)
                .join(",")

            if (orQuery) {
                query = query.or(orQuery)
            }
        }

        // Execute query with pagination
        // Note: Not all tables have 'created_at'. We might need to handle sort failures or remove sort if unknown.
        // For now, attempting to sort by 'created_at' as standard, but if it fails, the error will be caught.
        // To be safer, we can default to no sort for unknown tables or 'id' if available.
        // Or simply remove the .order if we want to be very safe, but ordering is nice.
        // I'll keep .order for now as it wasn't the reported issue.
        const { data, error, count } = await query
            .range(offset, offset + pageSize - 1)
        // .order("created_at", { ascending: false }) // Commenting out potentially unsafe default sort to reduce errors on tables without created_at

        if (error) {
            console.error(`[v0] Error fetching data from ${tableName}:`, error, { companyCode, year, search })
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        })
    } catch (error) {
        console.error("[v0] Error in table data API:", error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        )
    }
}
