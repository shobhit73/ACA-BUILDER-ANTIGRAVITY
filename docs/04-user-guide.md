# 04 - User Guide & Troubleshooting

## 1. Getting Started for Employer Admins

### Step 1: Company Setup
1.  Navigate to **Settings > Company**.
2.  Ensure your **EIN**, **Address**, and **Contact Info** are 100% correct. These appear on the 1094-C (Cover Sheet).
3.  Click "Edit" -> "Modules" tab. Enable:
    *   **ACA Monthly Reporting**
    *   **Penalty Analysis Dashboard**

### Step 2: Plan Configuration
1.  Go to **Plan Configuration**.
2.  Create your Health Plans.
    *   **MEC (Minimum Essential Coverage)**: Must be YES for compliance.
    *   **MV (Minimum Value)**: Must be YES for compliance.
    *   **Employee Cost**: Enter the monthly amount the employee pays for *Self-Only* coverage.

### Step 3: Data Import
1.  Go to **Import Data**.
2.  Prepare your two CSV files:
    *   `census.csv`: Employee demographics (SSN, Name, Hire Date, Termination Date).
    *   `enrollment.csv` (Optional but recommended): Who actually took the coverage.
3.  Upload them. Wait for the comprehensive "Validation Check" to pass.

---

## 2. Generating Reports (The Core Workflow)

### Phase 1: Monthly Interim Report
*   **Action**: Go to **ACA Report** page. Click **"Generate Monthly Report"**.
*   **What it does**: It calculates eligibility for every employee for every month of the year so far.
*   **Verify**: Look at the "View Data" tables. Do you see 12 rows for your full-time employees?

### Phase 2: Final IRS Codes
*   **Action**: On **ACA Report** page, click **"Generate 1095-C Codes"**.
*   **What it does**: Runs the complex logic to assign Line 14 (Offer) and Line 16 (Safe Harbor) codes.
*   **Verify**: Check the "Final Report" table.
    *   *Common Check*: Do your full-time employees have `1A` or `1E`?
    *   *Common Check*: Do your part-timers have `1H` / `2B`?

### Phase 3: Penalty Analysis
*   **Action**: Go to **ACA Penalties**. Click **"Calculate Penalties"**.
*   **Review**:
    *   **Penalty A**: Should be $0 if you offered coverage to >95% of full-time employees.
    *   **Penalty B**: Should be minimal. Occurs if coverage was unaffordable and the employee waived it (and presumably went to the exchange).

---

## 3. Troubleshooting Common Issues

### "500 Internal Server Error" during Generation
*   **Cause**: Usually a database timeout or a "Duplicate Key" error from bad data.
*   **Fix**:
    1.  Check the "Notifications" bell or your browser console.
    2.  Try re-running the **Import** to clean up data.
    3.  If persistent, contact System Admin (Db Logs will show `duplicate key value violates unique constraint`).

### "No Data Found" in Reports
*   **Cause**: Likely a Permissions (RLS) issue.
*   **Fix**:
    1.  Are you logged in as the correct user?
    2.  Does your user account have access to this Company Code?
    3.  Admin: Check `user_company_mapping` table.

### "Employee Missing Line 16 Codes"
*   **Cause**: The system couldn't find a valid Safe Harbor.
*   **Fix**:
    *   Was the employee employed? (If no, check Hire/Term dates).
    *   Was the plan affordable? (If cost > $50, safe harbor 2F might not trigger).
    *   Check **Plan Configuration** cost fields.
