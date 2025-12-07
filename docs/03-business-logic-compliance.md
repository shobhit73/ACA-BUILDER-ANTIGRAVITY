# 03 - Business Logic & Compliance Analysis

> **Role**: Senior Solution Architect / ACA Compliance Expert
> **Scope**: Critical review of current SQL logic vs. IRS Regulations (Title 26, Section 4980H).

## Overview
The current implementation provides a **solid functional foundation** for generating Forms 1095-C. It correctly identifies the core variables: Employment Status, Plan Eligibility, and Enrollment. However, to achieve **100% IRS Audit Compliance**, several simplifications in the current logic must be addressed.

---

## 1. Compliance Gap Analysis

### A. Affordability Thresholds (Critical)
*   **Current State**: The system uses a hardcoded value of `$50.00` in SQL functions (`generate_aca_final_report`).
*   **IRS Regulation**: The "Affordability Percentage" changes annually (e.g., 9.61% in 2022, 9.12% in 2023, 8.39% in 2024). It is calculated based on the *Lowest Cost Silver Plan* vs. the employee's Rate of Pay, W-2 Wages, or Federal Poverty Line.
*   **Risk**: A plan costing $75 might be "Affordable" for a high earner but "Unaffordable" for a minimum wage worker. Hardcoding $50 risks generating False Positives (Penalty B) or False Negatives.
*   **Proposed Resolution**:
    1.  Create a `tax_year_config` table: `(year, affordability_percentage, poverty_line_monthly)`.
    2.  Update Line 16 logic to calculate: `(Rate * 130 hours * Percentage)`. If Plan Cost < Result, use Code 2H (Rate of Pay Safe Harbor).

### B. Dependent Age Limiting ("Age 26 Rule")
*   **Current State**: The system checks `is_eligible_child` based on the *Plan Master* configuration. It assumes if the Plan covers children, the employee's children are covered.
*   **IRS Regulation**: An employer MUST offer coverage to dependents until they turn 26. If an employee has a child aged 27, they are *not* a "Dependent" for ACA purposes.
*   **Risk**: If the Census includes a 27-year-old child and the Plan says "Covers Children", we might code this as "1E" (Family Offer). If that child isn't actually eligible due to age, the code should potentially be different.
*   **Proposed Resolution**:
    1.  Ensure `employee_dependent` table has `dob`.
    2.  In `generate_aca_monthly_interim`, filter dependents:
        ```sql
        WHERE dependent.dob > (tax_year_start - INTERVAL '26 years')
        ```

### C. "Qualifying Offer" (Code 1A) Specifics
*   **Current State**: Code 1A is used when "Full Time + MEC + MV + Family + Emp + Affordable".
*   **IRS Regulation**: To use Code 1A, the employer must *also* not require an employee contribution of more than ~9.5% of the *Federal Poverty Line* (approx $100/mo). It is distinct from W-2 affordability.
*   **Risk**: We might be over-using Code 1A for plans that are affordable by W-2 but not by Poverty Line.
*   **Action**: Verify the `$50` hardcode. If $50 is intended to be below the Poverty Line threshold (~$103), then this logic is actually **safe/conservative**.

---

## 2. Detailed Verification of Current SQL Logic

### Line 14 (Offer of Coverage)
The `CASE` statement in `004-consolidated-functions.sql` correctly prioritizes codes:

1.  **Code 1H (No Offer)**: Correctly placed first. If `offer_of_coverage` is NULL/False, stop here.
2.  **Code 1A**: Correctly checks `mvc` (Minimum Value), `me` (MEC), and Family offerings.
3.  **Code 1E (Family Unaffordable)**: Fallback if 1A fails on cost.
4.  **Codes 1B/1C/1D/1E**: Correctly split based on specific `is_eligible_spouse/child` flags.

**Verdict**: Logic flow is **Compliant**, subject to the `$50` threshold accuracy.

### Line 16 (Safe Harbors)
1.  **Code 2A (Not Employed)**: Checks `employed_in_month`. **Correct.**
2.  **Code 2B (Not Full Time)**: Checks `full_time_flag`. **Correct.**
3.  **Code 2C (Enrolled)**: Checks `enrolled_in_coverage`. **Correct.** Note: This *must* take precedence over 2F/2G/2H, which the SQL does correctly.
4.  **Code 2F (W-2 Safe Harbor)**:
    *   *Bug Fix Verified*: Recent check `pm.option_emp <= 50` fixes the issue where unaffordable plans were marked safe.
    *   *Improvement*: This requires the user to *actually use* the W-2 method. If they use Rate of Pay (2H), this code is technically wrong. System should allow selecting the Safe Harbor method per-company.

---

## 3. Scaling & Architecture Recommendations (The "Senior View")

### Database Constraints
The use of `LATERAL` joins in `generate_aca_monthly_interim` is powerful but computationally expensive.
*   **Observation**: `CROSS JOIN`ing 12 months against 10,000 employees = 120,000 rows generated in memory *before* filtering.
*   **Impact**: On a standard Postgres instance, this is fine. For >50k employees, this will degrade.
*   **Recommendation**:
    *   **Materialized Views**: Pre-calculate the "Eligibility" matrix refreshes nightly.
    *   **Partitioning**: Split `aca_employee_monthly_status` by `company_code` to reduce index interaction.

### Compliance Safety Net
Currently, the system is "Black Box" — it generates a code and puts it in the DB.
**Recommendation**: Build a **"Trace Log"** table.
*   Instead of just saving `1E`, save a JSON blob:
    ```json
    {
      "decision": "1E",
      "factors": {
        "full_time": true,
        "mec_offered": true,
        "cost": 150.00,
        "threshold": 98.00,
        "safe_harbor_method": "W-2"
      }
    }
    ```
*   This allows the "Explainability" feature that auditors love.
