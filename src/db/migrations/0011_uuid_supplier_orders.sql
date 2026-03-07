-- ✅ Étape 6 — Migration PKs: serial -> uuid
-- Migration: 0011_uuid_supplier_orders.sql

BEGIN;

-- ══════════════════════════════════════════════════
-- ÉTAPE A : supplier_orders.id → uuid
-- ══════════════════════════════════════════════════

-- 1. Ajouter colonne uuid temporaire dans supplier_orders
ALTER TABLE supplier_orders ADD COLUMN new_id uuid DEFAULT gen_random_uuid() NOT NULL;

-- 2. Ajouter colonnes uuid temporaires dans toutes les tables avec FK
ALTER TABLE supplier_order_payments ADD COLUMN new_order_id uuid;
ALTER TABLE supplier_order_items    ADD COLUMN new_order_id uuid;
ALTER TABLE supplier_payments       ADD COLUMN new_order_id uuid;

-- 3. Propager les nouveaux UUIDs vers les tables FK
UPDATE supplier_order_payments sop
  SET new_order_id = so.new_id
  FROM supplier_orders so WHERE so.id = sop.order_id;

UPDATE supplier_order_items soi
  SET new_order_id = so.new_id
  FROM supplier_orders so WHERE so.id = soi.order_id;

UPDATE supplier_payments sp
  SET new_order_id = so.new_id
  FROM supplier_orders so WHERE so.id = sp.order_id;

-- 4. Vérifier que toutes les FK ont été propagées
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM supplier_order_payments WHERE new_order_id IS NULL AND order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Migration échouée : supplier_order_payments contient des new_order_id NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM supplier_order_items WHERE new_order_id IS NULL AND order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Migration échouée : supplier_order_items contient des new_order_id NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM supplier_payments WHERE new_order_id IS NULL AND order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Migration échouée : supplier_payments contient des new_order_id NULL';
  END IF;
END $$;

-- 5. Supprimer les anciennes contraintes FK
ALTER TABLE supplier_order_payments DROP CONSTRAINT IF EXISTS supplier_order_payments_order_id_supplier_orders_id_fk;
ALTER TABLE supplier_order_items    DROP CONSTRAINT IF EXISTS supplier_order_items_order_id_supplier_orders_id_fk;
ALTER TABLE supplier_payments       DROP CONSTRAINT IF EXISTS supplier_payments_order_id_supplier_orders_id_fk;

-- 6. Supprimer l'ancienne PK int et renommer la nouvelle dans supplier_orders
ALTER TABLE supplier_orders DROP CONSTRAINT supplier_orders_pkey CASCADE;
ALTER TABLE supplier_orders DROP COLUMN id;
ALTER TABLE supplier_orders RENAME COLUMN new_id TO id;
ALTER TABLE supplier_orders ADD PRIMARY KEY (id);

-- 7. Mettre à jour les colonnes FK et recréer les contraintes
-- pour supplier_order_payments
ALTER TABLE supplier_order_payments DROP COLUMN order_id;
ALTER TABLE supplier_order_payments RENAME COLUMN new_order_id TO order_id;
ALTER TABLE supplier_order_payments ADD CONSTRAINT supplier_order_payments_order_id_supplier_orders_id_fk
  FOREIGN KEY (order_id) REFERENCES supplier_orders(id) ON DELETE CASCADE;

-- pour supplier_order_items
ALTER TABLE supplier_order_items DROP COLUMN order_id;
ALTER TABLE supplier_order_items RENAME COLUMN new_order_id TO order_id;
-- make it not null since it was not null before
ALTER TABLE supplier_order_items ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE supplier_order_items ADD CONSTRAINT supplier_order_items_order_id_supplier_orders_id_fk
  FOREIGN KEY (order_id) REFERENCES supplier_orders(id) ON DELETE CASCADE;

-- pour supplier_payments
ALTER TABLE supplier_payments DROP COLUMN order_id;
ALTER TABLE supplier_payments RENAME COLUMN new_order_id TO order_id;
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_order_id_supplier_orders_id_fk
  FOREIGN KEY (order_id) REFERENCES supplier_orders(id) ON DELETE SET NULL;


-- ══════════════════════════════════════════════════
-- ÉTAPE B : supplier_order_payments.id → uuid
-- ══════════════════════════════════════════════════
ALTER TABLE supplier_order_payments ADD COLUMN new_id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE supplier_order_payments DROP CONSTRAINT supplier_order_payments_pkey CASCADE;
ALTER TABLE supplier_order_payments DROP COLUMN id;
ALTER TABLE supplier_order_payments RENAME COLUMN new_id TO id;
ALTER TABLE supplier_order_payments ADD PRIMARY KEY (id);

-- ══════════════════════════════════════════════════
-- ÉTAPE C : Recréer supplier_balance_view
-- ⚠️ Le DROP CONSTRAINT ... CASCADE des étapes A et B
--    supprime automatiquement la view supplier_balance_view.
--    Elle doit être recréée ici après la migration UUID.
-- ══════════════════════════════════════════════════
CREATE OR REPLACE VIEW supplier_balance_view AS
SELECT
  s.id        AS supplier_id,
  s.user_id,
  COALESCE(orders_agg.total_achats,      0) AS total_achats,
  COALESCE(payments_agg.total_paiements, 0) AS total_paiements,
  COALESCE(orders_agg.total_achats,      0)
    - COALESCE(payments_agg.total_paiements, 0) AS solde_reel
FROM suppliers s
LEFT JOIN (
  SELECT supplier_id, user_id, SUM(montant_total) AS total_achats
  FROM supplier_orders
  GROUP BY supplier_id, user_id
) AS orders_agg
  ON orders_agg.supplier_id = s.id AND orders_agg.user_id = s.user_id
LEFT JOIN (
  SELECT supplier_id, user_id, SUM(amount) AS total_paiements
  FROM supplier_payments
  GROUP BY supplier_id, user_id
) AS payments_agg
  ON payments_agg.supplier_id = s.id AND payments_agg.user_id = s.user_id;

COMMIT;
