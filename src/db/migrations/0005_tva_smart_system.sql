
-- 🔒 START TRANSACTION: Either everything succeeds or nothing
BEGIN;

-- 1. Add new columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_tva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'TTC' CHECK (price_type IN ('HT', 'TTC')),
ADD COLUMN IF NOT EXISTS sale_price_ht DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sale_price_tva DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sale_price_ttc DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS exemption_note TEXT;

-- 2. Data Migration (Logic: Existing prix_vente is TTC)
-- We calculate HT from TTC: HT = TTC / 1.2
UPDATE products 
SET 
  sale_price_ttc = prix_vente,
  sale_price_ht = ROUND(prix_vente / 1.20, 2),
  sale_price_tva = ROUND(prix_vente - (prix_vente / 1.20), 2)
WHERE deleted_at IS NULL AND sale_price_ttc IS NULL;

-- 3. Apply Strict Constraints 🛡️
-- Prices must be non-negative
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_sale_price_positive;
ALTER TABLE products ADD CONSTRAINT chk_sale_price_positive CHECK (
  sale_price_ht >= 0 AND sale_price_tva >= 0 AND sale_price_ttc >= 0
);

-- Consistency check (HT + TVA = TTC) with 0.02 tolerance for rounding
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_tva_coherence;
ALTER TABLE products ADD CONSTRAINT chk_tva_coherence CHECK (
  ABS((sale_price_ht + sale_price_tva) - sale_price_ttc) <= 0.02
);

-- 4. Speed up queries (Indexes) ⚡
CREATE INDEX IF NOT EXISTS idx_products_has_tva ON products(has_tva);
CREATE INDEX IF NOT EXISTS idx_products_price_type ON products(price_type);
CREATE INDEX IF NOT EXISTS idx_products_ttc_active ON products(sale_price_ttc) WHERE deleted_at IS NULL;

-- 5. Final Validation (Inline)
DO $$
DECLARE 
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM products 
  WHERE (sale_price_ttc IS NULL OR sale_price_ht IS NULL) AND deleted_at IS NULL;
  
  IF missing_count > 0 THEN
    RAISE EXCEPTION '❌ Error: % products were not migrated correctly!', missing_count;
  END IF;
END $$;

-- 🔒 COMMIT: Save changes
COMMIT;
