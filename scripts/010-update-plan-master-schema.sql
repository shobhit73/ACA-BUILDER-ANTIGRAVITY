-- ====================================================================
-- UPDATE PLAN MASTER SCHEMA
-- Purpose: Add option mapping columns for ACA configuration
-- ====================================================================

ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS option_emp VARCHAR(50);
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS option_emp_spouse VARCHAR(50);
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS option_emp_child VARCHAR(50);
ALTER TABLE plan_master ADD COLUMN IF NOT EXISTS option_emp_family VARCHAR(50);

-- Optional: Add comments
COMMENT ON COLUMN plan_master.option_emp IS 'Option code for Employee Only coverage';
COMMENT ON COLUMN plan_master.option_emp_spouse IS 'Option code for Employee + Spouse coverage';
COMMENT ON COLUMN plan_master.option_emp_child IS 'Option code for Employee + Child coverage';
COMMENT ON COLUMN plan_master.option_emp_family IS 'Option code for Family coverage';
