export interface TableInfo {
    name: string
    label: string
    description: string
    group: "Foundation" | "Employee Data" | "Plan Data" | "Payroll" | "ACA Interim"
}

export const TABLES: TableInfo[] = [
    { name: "company_details", label: "Company Details", description: "Company information", group: "Foundation" },
    { name: "plan_master", label: "Plan Master", description: "Health plan definitions", group: "Foundation" },
    { name: "employee_census", label: "Employee Census", description: "Employee demographic data", group: "Employee Data" },
    { name: "employee_address", label: "Employee Address", description: "Employee addresses", group: "Employee Data" },
    { name: "employee_waiting_period", label: "Employee Waiting Period", description: "Waiting periods", group: "Employee Data" },
    { name: "employee_plan_eligibility", label: "Employee Plan Eligibility", description: "Plan eligibility", group: "Plan Data" },
    { name: "employee_plan_enrollment", label: "Employee Plan Enrollment", description: "Plan enrollments", group: "Plan Data" },
    { name: "employee_dependent", label: "Employee Dependent", description: "Dependent information", group: "Employee Data" },
    { name: "plan_enrollment_cost", label: "Plan Enrollment Cost", description: "Cost breakdown", group: "Plan Data" },
    { name: "payroll_hours", label: "Payroll Hours", description: "Payroll tracking", group: "Payroll" },
    { name: "aca_employee_monthly_status", label: "ACA Employee Monthly Status", description: "Monthly employment status", group: "ACA Interim" },
    { name: "aca_employee_monthly_offer", label: "ACA Employee Monthly Offer", description: "Monthly coverage offers", group: "ACA Interim" },
    { name: "aca_employee_monthly_enrollment", label: "ACA Employee Monthly Enrollment", description: "Monthly enrollments", group: "ACA Interim" },
]
