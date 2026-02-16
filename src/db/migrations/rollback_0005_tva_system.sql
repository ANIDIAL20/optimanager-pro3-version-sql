-- ====================================
-- 🔄 ROLLBACK: TVA System Migration
-- Date: 2026-02-15
-- Purpose: Undo all changes from 0005_tva_system
-- ====================================

-- ⚠️ WARNING: This will remove all TVA-related columns
-- Use only if critical issue detected

BEGIN;

-- 1. Drop indexes
DROP INDEX IF EXISTS idx_products_has_tva;
DROP INDEX IF EXISTS idx_products_price_type;
DROP INDEX IF EXISTS idx_products_ttc_active;
DROP INDEX IF EXISTS idx_products_pos_lookup;

-- 2. Drop constraints (if added)
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_sale_price_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_tva_coherence;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_no_tva_means_zero;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_price_type_valid;

-- 3. Drop columns (reverse order)
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_ttc;
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_tva;
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_ht;
ALTER TABLE products DROP COLUMN IF EXISTS price_type;
ALTER TABLE products DROP COLUMN IF EXISTS exemption_note;
ALTER TABLE products DROP COLUMN IF EXISTS has_tva;

-- 4. Verification
SELECT 
  column_name 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND (column_name LIKE '%tva%' OR column_name LIKE 'sale_price%');

-- Should return: 0 rows

COMMIT;

-- ====================================
-- ✅ Rollback completed successfully
-- Database reverted to pre-migration state
-- ====================================
