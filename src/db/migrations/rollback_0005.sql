
BEGIN;
ALTER TABLE products DROP COLUMN IF EXISTS has_tva;
ALTER TABLE products DROP COLUMN IF EXISTS price_type;
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_ht;
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_tva;
ALTER TABLE products DROP COLUMN IF EXISTS sale_price_ttc;
ALTER TABLE products DROP COLUMN IF EXISTS exemption_note;
COMMIT;
