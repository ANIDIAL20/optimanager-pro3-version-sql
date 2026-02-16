-- ====================================
-- 🔒 ADD CONSTRAINTS - TVA System
-- OptiManager Pro 3
-- Date: 2026-02-15
-- ====================================
--
-- Purpose: Enforce data integrity at database level
-- These constraints prevent invalid data from being inserted,
-- providing protection even if application code has bugs.
--
-- ⚠️ IMPORTANT:
-- - This migration may FAIL if existing data violates constraints
-- - Run validation script FIRST to identify and fix issues
-- - Backup database before applying
--
-- Usage: 
-- psql -U postgres -d optimanager_db -f src/db/migrations/0006_add_tva_constraints.sql
-- ====================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔒 Adding TVA System Constraints'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- CONSTRAINT 1: Positive Prices
-- ============================================
\echo '📋 Constraint 1: Positive prices (no negative values)...'

ALTER TABLE products 
ADD CONSTRAINT chk_sale_price_positive 
CHECK (
  (sale_price_ht >= 0 OR sale_price_ht IS NULL)
  AND (sale_price_tva >= 0 OR sale_price_tva IS NULL)
  AND (sale_price_ttc >= 0 OR sale_price_ttc IS NULL)
);

\echo '   ✅ Added: chk_sale_price_positive'
\echo '   Rule: HT, TVA, and TTC must all be >= 0'
\echo ''

-- ============================================
-- CONSTRAINT 2: Mathematical Coherence
-- ============================================
\echo '📋 Constraint 2: Mathematical coherence (HT + TVA = TTC)...'

ALTER TABLE products 
ADD CONSTRAINT chk_tva_coherence 
CHECK (
  sale_price_ht IS NULL  -- Allow NULL during partial data entry
  OR sale_price_tva IS NULL
  OR sale_price_ttc IS NULL
  OR ABS((sale_price_ht + sale_price_tva) - sale_price_ttc) < 0.02
);

\echo '   ✅ Added: chk_tva_coherence'
\echo '   Rule: |HT + TVA - TTC| < 0.02 (tolerance for rounding)'
\echo ''

-- ============================================
-- CONSTRAINT 3: Exemption Logic
-- ============================================
\echo '📋 Constraint 3: Exemption logic (no TVA = 0 TVA)...'

ALTER TABLE products 
ADD CONSTRAINT chk_no_tva_means_zero 
CHECK (
  has_tva IS NULL  -- Allow NULL during data entry
  OR sale_price_tva IS NULL
  OR (has_tva = false AND sale_price_tva = 0)  -- Exempted → TVA = 0
  OR (has_tva = true)  -- Taxable → any TVA value allowed
);

\echo '   ✅ Added: chk_no_tva_means_zero'
\echo '   Rule: If has_tva = false, then sale_price_tva must be 0'
\echo ''

-- ============================================
-- CONSTRAINT 4: Price Type Validity
-- ============================================
\echo '📋 Constraint 4: Valid price type enum...'

ALTER TABLE products 
ADD CONSTRAINT chk_price_type_valid 
CHECK (
  price_type IS NULL
  OR price_type IN ('HT', 'TTC')
);

\echo '   ✅ Added: chk_price_type_valid'
\echo '   Rule: price_type must be "HT" or "TTC"'
\echo ''

-- ============================================
-- CONSTRAINT 5: Reasonable TVA Rate
-- ============================================
\echo '📋 Constraint 5: Reasonable TVA rate (between 0% and 25%)...'

ALTER TABLE products 
ADD CONSTRAINT chk_tva_rate_reasonable 
CHECK (
  sale_price_ht IS NULL
  OR sale_price_tva IS NULL
  OR sale_price_ht = 0  -- Allow division by zero protection
  OR has_tva = false  -- Exempted products can have 0%
  OR (
    (sale_price_tva / NULLIF(sale_price_ht, 0)) >= 0 
    AND (sale_price_tva / NULLIF(sale_price_ht, 0)) <= 0.25
  )
);

\echo '   ✅ Added: chk_tva_rate_reasonable'
\echo '   Rule: TVA rate between 0% and 25% (catches calculation errors)'
\echo ''

-- ============================================
-- CONSTRAINT 6: HT Cannot Exceed TTC
-- ============================================
\echo '📋 Constraint 6: HT must be <= TTC (price before tax cannot exceed final price)...'

ALTER TABLE products 
ADD CONSTRAINT chk_ht_lte_ttc 
CHECK (
  sale_price_ht IS NULL
  OR sale_price_ttc IS NULL
  OR sale_price_ht <= sale_price_ttc
);

\echo '   ✅ Added: chk_ht_lte_ttc'
\echo '   Rule: HT must be less than or equal to TTC'
\echo ''


-- ============================================
-- VERIFICATION
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 Verifying Constraints'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  conname as "Constraint Name",
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
  END as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND conname LIKE 'chk_%'
ORDER BY conname;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ All Constraints Added Successfully'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '⚠️ IMPORTANT NOTES:'
\echo '1. These constraints are NOW ACTIVE'
\echo '2. Any INSERT/UPDATE violating rules will be REJECTED'
\echo '3. Test thoroughly before production deployment'
\echo ''

COMMIT;
