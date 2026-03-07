-- ✅ Étape 1 — Add dedicated contact columns to suppliers table
-- Migration: 0010_add_supplier_contact_columns.sql

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS contact_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- ✅ Étape 2 — Create supplier_balance_view
-- Version corrigée avec subqueries pour éviter le Cartesian Product (produit cartésien)
-- Bug de la version naïve : double JOIN direct génère total_achats × nb_paiements lignes

CREATE OR REPLACE VIEW supplier_balance_view AS
SELECT
  s.id        AS supplier_id,
  s.user_id,
  COALESCE(orders_agg.total_achats,      0) AS total_achats,
  COALESCE(payments_agg.total_paiements, 0) AS total_paiements,
  COALESCE(orders_agg.total_achats,      0)
    - COALESCE(payments_agg.total_paiements, 0) AS solde_reel
FROM suppliers s

-- Sous-requête 1 : agrégation des commandes (isolée pour éviter le produit cartésien)
LEFT JOIN (
  SELECT
    supplier_id,
    user_id,
    SUM(montant_total) AS total_achats
  FROM supplier_orders
  GROUP BY supplier_id, user_id
) AS orders_agg
  ON orders_agg.supplier_id = s.id
  AND orders_agg.user_id    = s.user_id

-- Sous-requête 2 : agrégation des paiements (isolée)
LEFT JOIN (
  SELECT
    supplier_id,
    user_id,
    SUM(amount) AS total_paiements
  FROM supplier_payments
  GROUP BY supplier_id, user_id
) AS payments_agg
  ON payments_agg.supplier_id = s.id
  AND payments_agg.user_id    = s.user_id;

-- Commentaire : current_balance reste en place (rétrocompatibilité, @deprecated)
-- La view recalcule automatiquement à chaque lecture — aucune mise à jour manuelle nécessaire
