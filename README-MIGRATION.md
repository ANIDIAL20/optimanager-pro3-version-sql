# Guide de Migration : Système de Gestion des Fournisseurs V2

Ce document explique les étapes pour mettre à jour l'architecture de gestion des fournisseurs vers la version professionnelle (V2).

## 🚀 Étapes d'Application

### 1. Préparation du Schema

Assurez-vous que les nouveaux fichiers de schema sont bien reconnus dans `src/db/schema/` :

- `suppliers.schema.ts`
- `supplier-orders.schema.ts`
- `supplier-payments.schema.ts`
- `audit-log.schema.ts`

Exécutez la génération des migrations Drizzle :

```bash
npm run db:push
```

_Note : Cela créera les tables `suppliers_v2`, `supplier_orders_v2`, etc. sans toucher aux anciennes tables._

### 2. Audit des Données

Avant de migrer, lancez l'audit pour détecter d'éventuels problèmes dans les données actuelles :

```bash
npx tsx scripts/audit-current-data.ts
```

Consultez le fichier `data-audit-report.json` pour voir les anomalies (montants négatifs, dates futures).

### 3. Migration des Données

Lancez le script de migration. Il utilise une **Transaction SQL** : soit tout passe, soit rien ne change.

```bash
npx tsx scripts/migrate-existing-data.ts
```

### 4. Mise en place de la Vue de Performance (SQL)

Exécutez le script SQL dans votre console Neon ou via un outil de gestion DB pour créer la Vue Matérialisée :
Le fichier se trouve dans `migrations/create-supplier-balances-view.sql`.

### 5. Vérification

Vérifiez que les données sont bien présentes dans les nouvelles tables `_v2`. Vous pouvez maintenant mettre à jour vos repositories Drizzle pour pointer vers les nouveaux exports :

- `suppliers` -> exporté de `suppliers.schema.ts`
- `supplierOrders` -> exporté de `supplier-orders.schema.ts`
- `supplierPayments` -> exporté de `supplier-payments.schema.ts`

## 🛡️ Sécurité & Audit

- Tous les nouveaux enregistrements ont des contraintes `CHECK` (montants > 0).
- Le `soft delete` est actif (`deleted_at`).
- Les logs d'audit capturent désormais les changements de données (Prêt pour l'implémentation des triggers).

---

_Document généré pour le projet OptiManager Pro 3._
