-- Migration: Ajout de la colonne amount_paid dans lens_orders
-- Bug fix: l'avance sur verres ne se sauvegardait plus après suppression du module Caisse
-- La logique recordAdvancePayment doit persister le montant dans lensOrders.amountPaid

ALTER TABLE "lens_orders"
  ADD COLUMN IF NOT EXISTS "amount_paid" NUMERIC(10, 2) DEFAULT 0;
