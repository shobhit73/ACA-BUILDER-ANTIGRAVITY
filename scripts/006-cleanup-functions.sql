-- Drop the old version of the function that doesn't have the p_country parameter
-- This resolves the "Could not choose the best candidate function" error
DROP FUNCTION IF EXISTS upsert_company_details(
    character varying, character varying, character varying, character varying, 
    character varying, character varying, character varying, character varying, 
    character varying, character varying, character varying, character varying, 
    character varying, date
);
