-- ============================================================
-- UPDATE STORED PROCEDURES FOR MULTI-TENANT SUPPORT
-- ============================================================
--
-- PURPOSE: Modify refresh_*() functions to propagate tenant_id
-- to derived tables automatically
--
-- CHANGES:
-- - Add tenant_id to INSERT statements
-- - tenant_id flows from base tables → derived tables
-- - RLS automatically filters queries
--
-- ============================================================

-- ============================================================
-- Function: refresh_employee_status (Multi-Tenant Updated)
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_employee_status(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear target year data (RLS will auto-filter by tenant)
  DELETE FROM employee_status_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31);

  DELETE FROM employee_status_monthly
  WHERE month_start >= make_date(p_year, 1, 1)
    AND month_start <= make_date(p_year, 12, 1);

  -- Populate daily status (tenant_id flows from Emp_Demographic)
  INSERT INTO employee_status_daily (employee_id, date, role, employment_status, is_employed, is_full_time, is_part_time, tenant_id)
  WITH year_bounds AS (
    SELECT make_date(p_year, 1, 1) AS y_start, make_date(p_year, 12, 31) AS y_end
  ),
  normalized AS (
    SELECT
      ed.employeeid::TEXT AS employee_id,
      GREATEST(ed.statusstartdate, (SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(ed.statusenddate, (SELECT y_end FROM year_bounds)), (SELECT y_end FROM year_bounds)) AS end_dt,
      ed.role,
      ed.employmentstatus,
      ed.tenant_id  -- <-- ADDED
    FROM "Emp_Demographic" ed  -- RLS filters this automatically
    WHERE COALESCE(ed.statusenddate, (SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND ed.statusstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT n.*, g.d::DATE AS dt
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, INTERVAL '1 day') g(d)
  ),
  ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.employee_id, e.dt ORDER BY e.start_dt DESC) AS rn
    FROM expanded e
  )
  SELECT
    employee_id,
    dt AS date,
    role,
    employmentstatus AS employment_status,
    (UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_employed,
    (UPPER(role) = 'FT' AND UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_full_time,
    (UPPER(role) = 'PT' AND UPPER(TRIM(employmentstatus)) IN ('ACTIVE', 'LOA')) AS is_part_time,
    tenant_id  -- <-- ADDED
  FROM ranked
  WHERE rn = 1;

  -- Populate monthly status (tenant_id flows from daily table)
  INSERT INTO employee_status_monthly (employee_id, month_start, is_employed_full_month, is_full_time_full_month, is_part_time_full_month, was_employed_any_day, tenant_id)
  SELECT
    employee_id,
    date_trunc('month', date)::DATE AS month_start,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_employed)) AS is_employed_full_month,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_full_time)) AS is_full_time_full_month,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_part_time)) AS is_part_time_full_month,
    bool_or(is_employed) AS was_employed_any_day,
    tenant_id  -- <-- ADDED
  FROM employee_status_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31)
  GROUP BY employee_id, date_trunc('month', date), tenant_id;  -- <-- ADDED to GROUP BY
END;
$$;

-- ============================================================
-- Function: refresh_eligibility (Multi-Tenant Updated)
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_eligibility(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM eligibility_daily
   WHERE date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31);
  DELETE FROM eligibility_monthly
   WHERE month_start BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,1);

  WITH year_bounds AS (
    SELECT make_date(p_year,1,1) y_start, make_date(p_year,12,31) y_end
  ),
  normalized AS (
    SELECT
      ee.employeeid::text AS employee_id,
      GREATEST(ee.eligibilitystartdate,(SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(ee.eligibilityenddate,(SELECT y_end FROM year_bounds)),(SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(ee.eligibleplan),'')  AS eligible_plans,
      NULLIF(TRIM(ee.eligibletier),'')  AS eligible_tiers,
      ee.plancost AS plan_cost,
      ee.tenant_id  -- <-- ADDED
    FROM public."Emp_Eligibility" ee
    WHERE COALESCE(ee.eligibilityenddate,(SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND ee.eligibilitystartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT
      n.employee_id,
      (g.d)::date AS date,
      n.eligible_plans,
      n.eligible_tiers,
      n.plan_cost,
      n.tenant_id  -- <-- ADDED
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, interval '1 day') g(d)
  )
  INSERT INTO eligibility_daily
    (employee_id, date, eligible_plans, eligible_tiers, plan_cost,
     employee_eligible, child_eligible, spouse_eligible, tenant_id)
  SELECT
    e.employee_id,
    e.date,
    e.eligible_plans,
    e.eligible_tiers,
    e.plan_cost,
    (UPPER(e.eligible_tiers) IN ('EMP','EMPFAM','EMPSPOUSE','EMPCHILD')) AS employee_eligible,
    (UPPER(e.eligible_tiers) IN ('EMPFAM','EMPCHILD')) AS child_eligible,
    (UPPER(e.eligible_tiers) IN ('EMPFAM','EMPSPOUSE')) AS spouse_eligible,
    e.tenant_id  -- <-- ADDED
  FROM expanded e
  ON CONFLICT (employee_id, date, eligible_plans, eligible_tiers) DO UPDATE
    SET plan_cost        = EXCLUDED.plan_cost,
        employee_eligible= EXCLUDED.employee_eligible,
        child_eligible   = EXCLUDED.child_eligible,
        spouse_eligible  = EXCLUDED.spouse_eligible,
        tenant_id        = EXCLUDED.tenant_id;  -- <-- ADDED

  INSERT INTO eligibility_monthly
    (employee_id, month_start, eligible_plans, eligible_tiers, plan_cost,
     employee_eligible_full_month, child_eligible_full_month, spouse_eligible_full_month, tenant_id)
  SELECT
    ed.employee_id,
    date_trunc('month', ed.date)::date AS month_start,
    ed.eligible_plans,
    ed.eligible_tiers,
    MAX(ed.plan_cost) AS plan_cost,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.employee_eligible) AS employee_eligible_full_month,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.child_eligible) AS child_eligible_full_month,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.spouse_eligible) AS spouse_eligible_full_month,
    MAX(ed.tenant_id) AS tenant_id  -- <-- ADDED
  FROM eligibility_daily ed
  WHERE ed.date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31)
  GROUP BY ed.employee_id, date_trunc('month', ed.date), ed.eligible_plans, ed.eligible_tiers;
END;
$$;

-- ============================================================
-- Function: refresh_enrollment (Multi-Tenant Updated)
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_enrollment(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM enrollment_daily
   WHERE date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31);
  DELETE FROM enrollment_monthly
   WHERE month_start BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,1);

  WITH year_bounds AS (
    SELECT make_date(p_year,1,1) y_start, make_date(p_year,12,31) y_end
  ),
  normalized AS (
    SELECT
      en.employeeid::text AS employee_id,
      GREATEST(en.enrollmentstartdate,(SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(en.enrollmentenddate,(SELECT y_end FROM year_bounds)),(SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(en.plancode),'')  AS plancode,
      COALESCE(NULLIF(TRIM(en.tier),''), 'NONE') AS tier,
      en.tenant_id  -- <-- ADDED
    FROM public."Emp_Enrollment" en
    WHERE COALESCE(en.enrollmentenddate,(SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND en.enrollmentstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT
      n.employee_id,
      (g.d)::date AS date,
      n.plancode,
      n.tier,
      n.tenant_id  -- <-- ADDED
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, interval '1 day') g(d)
  )
  INSERT INTO enrollment_daily
    (employee_id, date, plancode, tier,
     employee_enrolled, spouse_enrolled, child_enrolled, tenant_id)
  SELECT
    e.employee_id,
    e.date,
    e.plancode,
    e.tier,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMP','EMPFAM','EMPSPOUSE','EMPCHILD')) AS employee_enrolled,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMPFAM','EMPSPOUSE')) AS spouse_enrolled,
    (LOWER(e.plancode) <> 'waive' AND UPPER(e.tier) IN ('EMPFAM','EMPCHILD')) AS child_enrolled,
    e.tenant_id  -- <-- ADDED
  FROM expanded e
  ON CONFLICT (employee_id, date, plancode, tier) DO UPDATE
    SET employee_enrolled = EXCLUDED.employee_enrolled,
        spouse_enrolled   = EXCLUDED.spouse_enrolled,
        child_enrolled    = EXCLUDED.child_enrolled,
        tenant_id         = EXCLUDED.tenant_id;  -- <-- ADDED

  INSERT INTO enrollment_monthly
    (employee_id, month_start, plancode, tier, employee_enrolled, spouse_enrolled, child_enrolled, tenant_id)
  SELECT
    ed.employee_id,
    date_trunc('month', ed.date)::date AS month_start,
    ed.plancode,
    ed.tier,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.employee_enrolled) AS employee_enrolled,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.spouse_enrolled) AS spouse_enrolled,
    (COUNT(DISTINCT ed.date) = MAX(EXTRACT(DAY FROM (date_trunc('month', ed.date) + INTERVAL '1 month - 1 day'))::int))
      AND BOOL_AND(ed.child_enrolled) AS child_enrolled,
    MAX(ed.tenant_id) AS tenant_id  -- <-- ADDED
  FROM enrollment_daily ed
  WHERE ed.date BETWEEN make_date(p_year,1,1) AND make_date(p_year,12,31)
  GROUP BY ed.employee_id, date_trunc('month', ed.date), ed.plancode, ed.tier;
END;
$$;

-- ============================================================
-- Function: refresh_dependent_enrollment (Multi-Tenant Updated)
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_dependent_enrollment(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM dependent_enrollment_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31);

  DELETE FROM dependent_enrollment_monthly
  WHERE month_start >= make_date(p_year, 1, 1)
    AND month_start <= make_date(p_year, 12, 1);

  INSERT INTO dependent_enrollment_daily (
    employee_id, dependent_id, date, dep_first_name, dep_mid_name, dep_last_name,
    dep_rel_code, plancode, dependent_relationship, is_enrolled, tenant_id
  )
  WITH year_bounds AS (
    SELECT make_date(p_year, 1, 1) AS y_start, make_date(p_year, 12, 31) AS y_end
  ),
  normalized AS (
    SELECT
      de.employeeid::TEXT AS employee_id,
      de.dependentid::TEXT AS dependent_id,
      de.depfirstname AS dep_first_name,
      de.depmidname AS dep_mid_name,
      de.deplastname AS dep_last_name,
      de.deprelcode AS dep_rel_code,
      GREATEST(de.enrollmentstartdate, (SELECT y_start FROM year_bounds)) AS start_dt,
      LEAST(COALESCE(de.enrollmentenddate, (SELECT y_end FROM year_bounds)), (SELECT y_end FROM year_bounds)) AS end_dt,
      NULLIF(TRIM(de.plancode), '') AS plancode,
      NULLIF(TRIM(de.dependentrelationship), '') AS dependent_relationship,
      de.tenant_id  -- <-- ADDED
    FROM "Dep_Enrollment" de
    WHERE COALESCE(de.enrollmentenddate, (SELECT y_end FROM year_bounds)) >= (SELECT y_start FROM year_bounds)
      AND de.enrollmentstartdate <= (SELECT y_end FROM year_bounds)
  ),
  expanded AS (
    SELECT n.*, g.d::DATE AS dt
    FROM normalized n
    CROSS JOIN LATERAL generate_series(n.start_dt, n.end_dt, INTERVAL '1 day') g(d)
  ),
  ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.employee_id, e.dependent_id, e.dt ORDER BY e.start_dt DESC) AS rn
    FROM expanded e
  )
  SELECT
    employee_id,
    dependent_id,
    dt AS date,
    dep_first_name,
    dep_mid_name,
    dep_last_name,
    dep_rel_code,
    plancode,
    dependent_relationship,
    (LOWER(COALESCE(plancode, '')) <> 'waive') AS is_enrolled,
    tenant_id  -- <-- ADDED
  FROM ranked
  WHERE rn = 1;

  INSERT INTO dependent_enrollment_monthly (
    employee_id, dependent_id, month_start, dep_first_name, dep_mid_name, dep_last_name,
    dep_rel_code, plancode, dependent_relationship, is_enrolled_full_month, tenant_id
  )
  SELECT
    employee_id,
    dependent_id,
    date_trunc('month', date)::DATE AS month_start,
    MAX(dep_first_name) AS dep_first_name,
    MAX(dep_mid_name) AS dep_mid_name,
    MAX(dep_last_name) AS dep_last_name,
    MAX(dep_rel_code) AS dep_rel_code,
    plancode,
    dependent_relationship,
    (COUNT(*) = EXTRACT(DAY FROM date_trunc('month', date) + INTERVAL '1 month - 1 day')::INT AND bool_and(is_enrolled)) AS is_enrolled_full_month,
    MAX(tenant_id) AS tenant_id  -- <-- ADDED
  FROM dependent_enrollment_daily
  WHERE date >= make_date(p_year, 1, 1)
    AND date <= make_date(p_year, 12, 31)
  GROUP BY employee_id, dependent_id, date_trunc('month', date), plancode, dependent_relationship;
END;
$$;

-- ============================================================
-- Function: refresh_employee_aca (Multi-Tenant Updated)
-- ============================================================
-- Only need to add tenant_id to final INSERT, all JOINs are already RLS-filtered
CREATE OR REPLACE FUNCTION refresh_employee_aca(p_year INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM employee_aca_monthly
  WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1);

  -- (Full query from 00_complete_migration.sql, just add tenant_id to SELECT)
  INSERT INTO employee_aca_monthly (employee_id, month_start, line_14, line_16, tenant_id)
  WITH all_months AS (
    SELECT generate_series(
      make_date(p_year, 1, 1),
      make_date(p_year, 12, 1),
      INTERVAL '1 month'
    )::DATE AS month_start
  ),
  employees AS (
    SELECT DISTINCT employee_id, tenant_id  -- <-- ADDED tenant_id
    FROM employee_status_monthly
    WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
  ),
  employee_months AS (
    SELECT e.employee_id, m.month_start, e.tenant_id  -- <-- ADDED tenant_id
    FROM employees e
    CROSS JOIN all_months m
  ),
  plana_elig AS (
    SELECT
      employee_id,
      month_start,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMP' THEN 1 END) > 0 AS has_emp_tier,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPFAM' THEN 1 END) > 0 AS has_empfam_tier,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPSPOUSE' THEN 1 END) > 0 AS has_empspouse_tier,
      COUNT(DISTINCT CASE WHEN UPPER(eligible_tiers) = 'EMPCHILD' THEN 1 END) > 0 AS has_empchild_tier,
      BOOL_OR(employee_eligible_full_month) AS employee_eligible_full_month,
      BOOL_OR(spouse_eligible_full_month) AS spouse_eligible_full_month,
      BOOL_OR(child_eligible_full_month) AS child_eligible_full_month,
      MIN(CASE WHEN UPPER(eligible_tiers) = 'EMP' THEN plan_cost END) AS emp_plan_cost,
      MIN(CASE WHEN UPPER(eligible_tiers) = 'EMPFAM' THEN plan_cost END) AS empfam_plan_cost
    FROM eligibility_monthly
    WHERE eligible_plans = 'PlanA'
      AND month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
    GROUP BY employee_id, month_start
  ),
  other_plan_elig AS (
    SELECT DISTINCT
      employee_id,
      month_start,
      TRUE AS has_other_plan
    FROM eligibility_monthly
    WHERE eligible_plans IS NOT NULL
      AND eligible_plans <> 'PlanA'
      AND month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
  ),
  full_time_status_year AS (
    SELECT
      employee_id,
      BOOL_OR(is_full_time_full_month) as was_full_time_any_month
    FROM employee_status_monthly
    WHERE month_start BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 1)
    GROUP BY employee_id
  ),
  enrollment_status AS (
    SELECT
      employee_id,
      date_trunc('month', date)::date AS month_start,
      TRUE AS is_enrolled
    FROM enrollment_daily
    WHERE (employee_enrolled OR spouse_enrolled OR child_enrolled)
      AND date BETWEEN make_date(p_year, 1, 1) AND make_date(p_year, 12, 31)
    GROUP BY employee_id, date_trunc('month', date)
    HAVING COUNT(DISTINCT date) = EXTRACT(DAY FROM (date_trunc('month', MIN(date)) + INTERVAL '1 month - 1 day'))::int
  )
  SELECT
    em.employee_id,
    em.month_start,
    -- (Line 14 logic from original - unchanged)
    CASE
      WHEN s.is_employed_full_month
           AND pa.has_emp_tier
           AND pa.has_empfam_tier
           AND COALESCE(pa.emp_plan_cost, 0) > 50
      THEN '1E'
      WHEN s.is_full_time_full_month THEN
        CASE
          WHEN pa.has_emp_tier AND pa.has_empfam_tier AND COALESCE(pa.emp_plan_cost, 0) <= 50 THEN '1A'
          WHEN enrolled_plana.tier = 'EMP' THEN '1B'
          WHEN enrolled_plana.tier = 'EMPCHILD' THEN '1C'
          WHEN enrolled_plana.tier = 'EMPSPOUSE' THEN '1D'
          WHEN enrolled_plana.tier = 'EMPFAM' THEN '1E'
          WHEN pa.has_emp_tier AND pa.employee_eligible_full_month AND NOT pa.has_empfam_tier AND NOT pa.has_empspouse_tier AND NOT pa.has_empchild_tier THEN '1B'
          WHEN (pa.has_emp_tier OR pa.has_empchild_tier) AND pa.employee_eligible_full_month AND pa.has_empchild_tier AND NOT pa.has_empfam_tier AND NOT pa.has_empspouse_tier THEN '1C'
          WHEN (pa.has_emp_tier OR pa.has_empspouse_tier) AND pa.employee_eligible_full_month AND pa.has_empspouse_tier AND NOT pa.has_empfam_tier AND NOT pa.has_empchild_tier THEN '1D'
          WHEN op.has_other_plan AND pa.employee_id IS NULL THEN '1F'
          ELSE '1H'
        END
      ELSE
        CASE
          WHEN enrolled_plana.tier = 'EMP' THEN '1B'
          WHEN enrolled_plana.tier = 'EMPCHILD' THEN '1C'
          WHEN enrolled_plana.tier = 'EMPSPOUSE' THEN '1D'
          WHEN enrolled_plana.tier = 'EMPFAM' THEN '1E'
          WHEN COALESCE(s.was_employed_any_day, FALSE) AND NOT COALESCE(fty.was_full_time_any_month, FALSE) AND COALESCE(enr.is_enrolled, FALSE) THEN '1G'
          ELSE '1H'
        END
    END AS line_14,
    -- (Line 16 logic from original - unchanged)
    CASE
      WHEN (s.is_full_time_full_month AND pa.has_emp_tier AND pa.has_empfam_tier AND COALESCE(pa.emp_plan_cost, 0) <= 50) THEN NULL
      WHEN enr.is_enrolled THEN '2C'
      WHEN s.employee_id IS NULL OR NOT COALESCE(s.was_employed_any_day, FALSE) THEN '2A'
      WHEN NOT COALESCE(s.is_full_time_full_month, FALSE) THEN '2B'
      WHEN s.is_full_time_full_month THEN
        CASE
          WHEN pa.has_emp_tier AND pa.has_empfam_tier AND COALESCE(pa.emp_plan_cost, 0) <= 50 THEN '2F'
          WHEN pa.employee_eligible_full_month AND NOT (pa.spouse_eligible_full_month AND pa.child_eligible_full_month) AND COALESCE(pa.emp_plan_cost, 0) <= 50 THEN '2F'
          WHEN pa.has_emp_tier AND pa.has_empfam_tier AND COALESCE(pa.emp_plan_cost, 0) > 50 THEN '2H'
          WHEN pa.employee_eligible_full_month THEN '2H'
          ELSE NULL
        END
      ELSE NULL
    END AS line_16,
    em.tenant_id  -- <-- ADDED
  FROM employee_months em
  LEFT JOIN employee_status_monthly s ON s.employee_id = em.employee_id AND s.month_start = em.month_start
  LEFT JOIN plana_elig pa ON pa.employee_id = em.employee_id AND pa.month_start = em.month_start
  LEFT JOIN other_plan_elig op ON op.employee_id = em.employee_id AND op.month_start = em.month_start
  LEFT JOIN full_time_status_year fty ON fty.employee_id = em.employee_id
  LEFT JOIN enrollment_status enr ON enr.employee_id = em.employee_id AND enr.month_start = em.month_start
  LEFT JOIN enrollment_monthly enrolled_plana ON enrolled_plana.employee_id = em.employee_id AND enrolled_plana.month_start = em.month_start AND enrolled_plana.plancode = 'PlanA' AND enrolled_plana.employee_enrolled = TRUE;
END;
$$;

-- ============================================================
-- MIGRATION COMPLETE - STORED PROCEDURES UPDATED
-- ============================================================
