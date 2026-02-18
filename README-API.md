# Logic Métier & Server Actions (V2)

Ce document détaille les nouvelles API et actions pour la gestion professionnelle des fournisseurs.

## 📁 Structure des fichiers

- `src/lib/utils/supplier-utils.ts` : Calculs de solde et validations.
- `src/lib/utils/audit.ts` : Système d'enregistrement des traces.
- `src/app/actions/supplier-orders.ts` : Actions CRUD pour les commandes.
- `src/app/actions/supplier-payments.ts` : Actions CRUD pour les paiements.
- `src/app/actions/supplier-statement.ts` : Génération du relevé de compte.

## 🛠️ Server Actions

### Commandes Fournisseurs (`supplier-orders.ts`)

1.  **`createSupplierOrder`** : Crée une commande après validation. Enregistre un audit de type `INSERT`.
2.  **`updateSupplierOrder`** : Modifie une commande existante. Enregistre `oldData` et `newData` dans l'audit.
3.  **`deleteSupplierOrder`** : Effectue un **Soft Delete** (`deleted_at`). Réservé aux administrateurs.
4.  **`cancelSupplierOrder`** : Change le statut en `cancelled` et ajoute une note d'annulation.

### Paiements Fournisseurs (`supplier-payments.ts`)

1.  **`createSupplierPayment`** : Enregistre un paiement. Vérifie que le montant ne dépasse pas le solde dû.
2.  **`updateSupplierPayment`** : Modifie les détails d'un paiement (Admin uniquement).
3.  **`deleteSupplierPayment`** : Soft Delete du paiement (Admin uniquement).

### Relevé de Compte (`supplier-statement.ts`)

- **`getSupplierStatement`** : Retourne une vue agrégée des commandes et paiements non supprimés, ainsi qu'un résumé financier (Total Achats, Total Payé, Solde).

## 🛡️ Système d'Audit

Le fichier `src/db/schema/audit-log.schema.ts` définit la table `audit_logs_v2`.
Chaque action critique appelle `logAudit` qui capture :

- La table et l'ID de l'enregistrement.
- L'opération (INSERT/UPDATE/DELETE).
- Les données anciennes et nouvelles (JSONB).
- L'identifiant de l'utilisateur, son adresse IP et son User Agent.

## ⏱️ Mise à jour des Views

Une **Materialized View** `supplier_balances_view` est utilisée pour les performances.

- **Refresh Manuel** : `refreshSupplierBalances()` dans `src/lib/utils/refresh-views.ts`.
- **Refresh Automatique** : Configuré via un Cron Vercel toutes les 30 minutes sur l'endpoint `/api/cron/refresh-views`.

---

_Fin de la Phase 2 - OptiManager Pro 3._
