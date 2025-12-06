export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            company_details: {
                Row: {
                    company_code: string
                    company_name: string
                    dba_name: string | null
                    ein: string | null
                    address_line_1: string | null
                    address_line_2: string | null
                    city: string | null
                    state: string | null
                    zip_code: string | null
                    country: string | null
                    contact_name: string | null
                    contact_phone: string | null
                    contact_email: string | null
                    is_authoritative_transmittal: boolean
                    is_agg_ale_group: boolean
                    cert_qualifying_offer: boolean
                    cert_98_percent_offer: boolean
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    is_active: boolean
                    updated_at: string
                    role: string | null
                    company_code: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    company_code: string
                    company_name: string
                    dba_name?: string | null
                    ein?: string | null
                    address_line_1?: string | null
                    address_line_2?: string | null
                    city?: string | null
                    state?: string | null
                    zip_code?: string | null
                    country?: string | null
                    contact_name?: string | null
                    contact_phone?: string | null
                    contact_email?: string | null
                    is_authoritative_transmittal?: boolean
                    is_agg_ale_group?: boolean
                    cert_qualifying_offer?: boolean
                    cert_98_percent_offer?: boolean
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    updated_at?: string
                    created_at?: string
                }
                Update: {
                    company_code?: string
                    company_name?: string
                    dba_name?: string | null
                    ein?: string | null
                    address_line_1?: string | null
                    address_line_2?: string | null
                    city?: string | null
                    state?: string | null
                    zip_code?: string | null
                    country?: string | null
                    contact_name?: string | null
                    contact_phone?: string | null
                    contact_email?: string | null
                    is_authoritative_transmittal?: boolean
                    is_agg_ale_group?: boolean
                    cert_qualifying_offer?: boolean
                    cert_98_percent_offer?: boolean
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    updated_at?: string
                    created_at?: string
                }
            }
            company_module: {
                Row: {
                    company_code: string
                    module_code: string
                    is_enabled: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    module_code: string
                    is_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    module_code?: string
                    is_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            plan_master: {
                Row: {
                    company_code: string
                    plan_code: string
                    plan_name: string
                    plan_type: string | null
                    mvc: boolean
                    me: boolean
                    plan_affordable_cost: number | null
                    option_emp: number | null
                    option_emp_spouse: number | null
                    option_emp_child: number | null
                    option_emp_family: number | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    plan_code: string
                    plan_name: string
                    plan_type?: string | null
                    mvc?: boolean
                    me?: boolean
                    plan_affordable_cost?: number | null
                    option_emp?: number | null
                    option_emp_spouse?: number | null
                    option_emp_child?: number | null
                    option_emp_family?: number | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    plan_code?: string
                    plan_name?: string
                    plan_type?: string | null
                    mvc?: boolean
                    me?: boolean
                    plan_affordable_cost?: number | null
                    option_emp?: number | null
                    option_emp_spouse?: number | null
                    option_emp_child?: number | null
                    option_emp_family?: number | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_census: {
                Row: {
                    company_code: string
                    employee_id: string
                    first_name: string
                    middle_name: string | null
                    last_name: string | null
                    ssn: string | null
                    date_of_birth: string | null
                    gender: string | null
                    hire_date: string | null
                    termination_date: string | null
                    employment_status: string | null
                    job_title: string | null
                    department: string | null
                    full_time_equivalent: number | null
                    pay_frequency: string | null
                    employment_type_code: string | null
                    email: string | null
                    employee_category: string | null
                    notes: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    first_name: string
                    middle_name?: string | null
                    last_name?: string | null
                    ssn?: string | null
                    date_of_birth?: string | null
                    gender?: string | null
                    hire_date?: string | null
                    termination_date?: string | null
                    employment_status?: string | null
                    job_title?: string | null
                    department?: string | null
                    full_time_equivalent?: number | null
                    pay_frequency?: string | null
                    employment_type_code?: string | null
                    email?: string | null
                    employee_category?: string | null
                    notes?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    first_name?: string
                    middle_name?: string | null
                    last_name?: string | null
                    ssn?: string | null
                    date_of_birth?: string | null
                    gender?: string | null
                    hire_date?: string | null
                    termination_date?: string | null
                    employment_status?: string | null
                    job_title?: string | null
                    department?: string | null
                    full_time_equivalent?: number | null
                    pay_frequency?: string | null
                    employment_type_code?: string | null
                    email?: string | null
                    employee_category?: string | null
                    notes?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_address: {
                Row: {
                    company_code: string
                    employee_id: string
                    effective_date: string
                    address_line_1: string | null
                    address_line_2: string | null
                    city: string | null
                    state: string | null
                    zip_code: string | null
                    county: string | null
                    country: string | null
                    address_end_date: string | null
                    notes: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    effective_date: string
                    address_line_1?: string | null
                    address_line_2?: string | null
                    city?: string | null
                    state?: string | null
                    zip_code?: string | null
                    county?: string | null
                    country?: string | null
                    address_end_date?: string | null
                    notes?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    effective_date?: string
                    address_line_1?: string | null
                    address_line_2?: string | null
                    city?: string | null
                    state?: string | null
                    zip_code?: string | null
                    county?: string | null
                    country?: string | null
                    address_end_date?: string | null
                    notes?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_waiting_period: {
                Row: {
                    company_code: string
                    employee_id: string
                    plan_code: string | null
                    effective_date: string | null
                    waiting_period_end_date: string | null
                    wait_period_days: number | null
                    is_waiting_period_waived: boolean
                    waiver_reason: string | null
                    category_code: string | null
                    benefit_class: string | null
                    measurement_type: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    plan_code?: string | null
                    effective_date?: string | null
                    waiting_period_end_date?: string | null
                    wait_period_days?: number | null
                    is_waiting_period_waived?: boolean
                    waiver_reason?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    plan_code?: string | null
                    effective_date?: string | null
                    waiting_period_end_date?: string | null
                    wait_period_days?: number | null
                    is_waiting_period_waived?: boolean
                    waiver_reason?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_plan_eligibility: {
                Row: {
                    company_code: string
                    employee_id: string
                    plan_code: string
                    eligibility_start_date: string
                    eligibility_end_date: string | null
                    eligibility_status: string | null
                    benefit_class: string | null
                    measurement_type: string | null
                    option_code: string | null
                    plan_cost: number | null
                    category_code: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    plan_code: string
                    eligibility_start_date: string
                    eligibility_end_date?: string | null
                    eligibility_status?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    option_code?: string | null
                    plan_cost?: number | null
                    category_code?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    plan_code?: string
                    eligibility_start_date?: string
                    eligibility_end_date?: string | null
                    eligibility_status?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    option_code?: string | null
                    plan_cost?: number | null
                    category_code?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_plan_enrollment: {
                Row: {
                    enrollment_id: string
                    company_code: string
                    employee_id: string
                    plan_code: string
                    enrollment_date: string
                    effective_date: string
                    termination_date: string | null
                    coverage_tier: string | null
                    enrollment_status: string | null
                    enrollment_event: string | null
                    option_code: string | null
                    category_code: string | null
                    benefit_class: string | null
                    measurement_type: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    enrollment_id?: string
                    company_code: string
                    employee_id: string
                    plan_code: string
                    enrollment_date: string
                    effective_date: string
                    termination_date?: string | null
                    coverage_tier?: string | null
                    enrollment_status?: string | null
                    enrollment_event?: string | null
                    option_code?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    enrollment_id?: string
                    company_code?: string
                    employee_id?: string
                    plan_code?: string
                    enrollment_date?: string
                    effective_date?: string
                    termination_date?: string | null
                    coverage_tier?: string | null
                    enrollment_status?: string | null
                    enrollment_event?: string | null
                    option_code?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employee_dependent: {
                Row: {
                    company_code: string
                    employee_id: string
                    dependent_id: string
                    first_name: string
                    middle_name: string | null
                    last_name: string | null
                    ssn: string | null
                    date_of_birth: string | null
                    gender: string | null
                    relationship: string | null
                    is_disabled: boolean
                    enrollment_id: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    dependent_id: string
                    first_name: string
                    middle_name?: string | null
                    last_name?: string | null
                    ssn?: string | null
                    date_of_birth?: string | null
                    gender?: string | null
                    relationship?: string | null
                    is_disabled?: boolean
                    enrollment_id?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    dependent_id?: string
                    first_name?: string
                    middle_name?: string | null
                    last_name?: string | null
                    ssn?: string | null
                    date_of_birth?: string | null
                    gender?: string | null
                    relationship?: string | null
                    is_disabled?: boolean
                    enrollment_id?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            plan_enrollment_cost: {
                Row: {
                    enrollment_id: string
                    cost_period_start: string
                    cost_period_end: string | null
                    employee_cost: number | null
                    employer_cost: number | null
                    total_cost: number | null
                    coverage_id: string | null
                    category_code: string | null
                    benefit_class: string | null
                    measurement_type: string | null
                    add_name: string | null
                    add_date: string | null
                    modified_by: string | null
                    modified_on: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    enrollment_id: string
                    cost_period_start: string
                    cost_period_end?: string | null
                    employee_cost?: number | null
                    employer_cost?: number | null
                    total_cost?: number | null
                    coverage_id?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    enrollment_id?: string
                    cost_period_start?: string
                    cost_period_end?: string | null
                    employee_cost?: number | null
                    employer_cost?: number | null
                    total_cost?: number | null
                    coverage_id?: string | null
                    category_code?: string | null
                    benefit_class?: string | null
                    measurement_type?: string | null
                    add_name?: string | null
                    add_date?: string | null
                    modified_by?: string | null
                    modified_on?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            payroll_hours: {
                Row: {
                    company_code: string
                    employee_id: string
                    pay_period_start: string
                    pay_period_end: string
                    hours_worked: number | null
                    regular_hours: number | null
                    overtime_hours: number | null
                    gross_wages: number | null
                    month: number | null
                    add_name: string | null
                    add_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    company_code: string
                    employee_id: string
                    pay_period_start: string
                    pay_period_end: string
                    hours_worked?: number | null
                    regular_hours?: number | null
                    overtime_hours?: number | null
                    gross_wages?: number | null
                    month?: number | null
                    add_name?: string | null
                    add_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    company_code?: string
                    employee_id?: string
                    pay_period_start?: string
                    pay_period_end?: string
                    hours_worked?: number | null
                    regular_hours?: number | null
                    overtime_hours?: number | null
                    gross_wages?: number | null
                    month?: number | null
                    add_name?: string | null
                    add_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    first_name: string | null
                    last_name: string | null
                    role: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    first_name?: string | null
                    last_name?: string | null
                    role?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    first_name?: string | null
                    last_name?: string | null
                    role?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }

        }
        Functions: {
            upsert_company_details: {
                Args: {
                    p_company_code: string
                    p_company_name: string
                    p_dba_name?: string | null
                    p_ein?: string | null
                    p_address_line_1?: string | null
                    p_address_line_2?: string | null
                    p_city?: string | null
                    p_state?: string | null
                    p_zip_code?: string | null
                    p_country?: string | null
                    p_contact_name?: string | null
                    p_contact_phone?: string | null
                    p_contact_email?: string | null
                    p_is_authoritative_transmittal?: boolean
                    p_is_agg_ale_group?: boolean
                    p_cert_qualifying_offer?: boolean
                    p_cert_98_percent_offer?: boolean
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_company_module: {
                Args: {
                    p_company_code: string
                    p_module_code: string
                    p_is_enabled: boolean
                }
                Returns: Json
            }
            upsert_plan_master: {
                Args: {
                    p_company_code: string
                    p_plan_code: string
                    p_plan_name: string
                    p_plan_type?: string | null
                    p_mvc?: boolean
                    p_me?: boolean
                    p_plan_affordable_cost?: number | null
                    p_option_emp?: number | null
                    p_option_emp_spouse?: number | null
                    p_option_emp_child?: number | null
                    p_option_emp_family?: number | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_census: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_first_name: string
                    p_middle_name?: string | null
                    p_last_name?: string | null
                    p_ssn?: string | null
                    p_date_of_birth?: string | null
                    p_gender?: string | null
                    p_hire_date?: string | null
                    p_termination_date?: string | null
                    p_employment_status?: string | null
                    p_job_title?: string | null
                    p_department?: string | null
                    p_full_time_equivalent?: number | null
                    p_pay_frequency?: string | null
                    p_employment_type_code?: string | null
                    p_email?: string | null
                    p_employee_category?: string | null
                    p_notes?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_address: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_effective_date: string
                    p_address_line_1?: string | null
                    p_address_line_2?: string | null
                    p_city?: string | null
                    p_state?: string | null
                    p_zip_code?: string | null
                    p_county?: string | null
                    p_country?: string | null
                    p_address_end_date?: string | null
                    p_notes?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_waiting_period: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_plan_code?: string | null
                    p_effective_date?: string | null
                    p_waiting_period_end_date?: string | null
                    p_wait_period_days?: number | null
                    p_is_waiting_period_waived?: boolean
                    p_waiver_reason?: string | null
                    p_category_code?: string | null
                    p_benefit_class?: string | null
                    p_measurement_type?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_plan_eligibility: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_plan_code: string
                    p_eligibility_start_date: string
                    p_eligibility_end_date?: string | null
                    p_eligibility_status?: string | null
                    p_benefit_class?: string | null
                    p_measurement_type?: string | null
                    p_option_code?: string | null
                    p_plan_cost?: number | null
                    p_category_code?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_plan_enrollment: {
                Args: {
                    p_enrollment_id: string
                    p_company_code: string
                    p_employee_id: string
                    p_plan_code: string
                    p_enrollment_date: string
                    p_effective_date: string
                    p_termination_date?: string | null
                    p_coverage_tier?: string | null
                    p_enrollment_status?: string | null
                    p_enrollment_event?: string | null
                    p_option_code?: string | null
                    p_category_code?: string | null
                    p_benefit_class?: string | null
                    p_measurement_type?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_employee_dependent: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_dependent_id: string
                    p_first_name: string
                    p_middle_name?: string | null
                    p_last_name?: string | null
                    p_ssn?: string | null
                    p_date_of_birth?: string | null
                    p_gender?: string | null
                    p_relationship?: string | null
                    p_is_disabled?: boolean
                    p_enrollment_id?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_plan_enrollment_cost: {
                Args: {
                    p_enrollment_id: string
                    p_cost_period_start: string
                    p_cost_period_end?: string | null
                    p_employee_cost?: number | null
                    p_employer_cost?: number | null
                    p_total_cost?: number | null
                    p_coverage_id?: string | null
                    p_category_code?: string | null
                    p_benefit_class?: string | null
                    p_measurement_type?: string | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
            upsert_payroll_hours: {
                Args: {
                    p_company_code: string
                    p_employee_id: string
                    p_pay_period_start: string
                    p_pay_period_end: string
                    p_hours_worked?: number | null
                    p_regular_hours?: number | null
                    p_overtime_hours?: number | null
                    p_gross_wages?: number | null
                    p_month?: number | null
                    p_add_name?: string | null
                    p_add_date?: string | null
                    p_modified_by?: string | null
                    p_modified_on?: string | null
                }
                Returns: Json
            }
        }
    }
}
