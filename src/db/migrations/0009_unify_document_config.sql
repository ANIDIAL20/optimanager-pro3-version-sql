-- Migration: 0009_unify_document_config
-- Unifies document template config to a single column: document_settings.
--
-- STEP 1: Copy any template config saved in document_config → document_settings
--   (only if document_config column exists AND the row has data there)
-- STEP 2: Ensure document_settings is typed correctly (already done via Drizzle schema)

-- Migrate data from document_config → document_settings where document_settings is still empty {}
-- (Using a safe conditional so it only runs if the document_config column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_profiles' AND column_name = 'document_config'
  ) THEN
    UPDATE shop_profiles
    SET document_settings = document_config
    WHERE
      document_config IS NOT NULL
      AND document_config::text <> '{}'
      AND (document_settings IS NULL OR document_settings::text = '{}');

    -- Drop the now-redundant column
    ALTER TABLE shop_profiles DROP COLUMN IF EXISTS document_config;
  END IF;
END;
$$;
