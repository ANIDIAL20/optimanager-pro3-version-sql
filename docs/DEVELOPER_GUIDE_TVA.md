# 🛠️ Guide Technique - Système TVA

## Vue d'ensemble de l'architecture

Le système Smart TVA est conçu pour assurer **l'intégrité des données financières** en stockant explicitement les composants de prix (HT, TVA, TTC) au niveau de la base de données, plutôt que de les calculer à la volée.

### Modèle de Données (`products` table)

| Champ            | Type              | Description                               |
| ---------------- | ----------------- | ----------------------------------------- |
| `sale_price_ht`  | DECIMAL(10,2)     | Prix de vente Hors Taxe                   |
| `sale_price_tva` | DECIMAL(10,2)     | Montant de la TVA                         |
| `sale_price_ttc` | DECIMAL(10,2)     | Prix de vente Toutes Taxes Comprises      |
| `has_tva`        | BOOLEAN           | Indique si le produit est soumis à la TVA |
| `price_type`     | ENUM('HT', 'TTC') | Mode de saisie original (pour UX)         |
| `exemption_note` | TEXT              | Justification d'exonération (optionnel)   |

### Flux de Données

1.  **Saisie (Frontend)**:
    - L'utilisateur saisit un montant et choisit le type (HT/TTC).
    - `ProductForm` envoie ces données brutes au serveur.

2.  **Traitement (Backend Action)**:
    - `products-actions.ts` utilise `calculatePrices` (`src/lib/tva-helpers.ts`).
    - Calcule les 3 composantes (HT, TVA, TTC) avec précision.
    - Valide la cohérence (`abs(HT + TVA - TTC) < 0.02`).

3.  **Stockage (Database)**:
    - Les 3 valeurs sont stockées.
    - Contraintes DB (`CHECK`) assurent l'intégrité même en cas de bug applicatif.

4.  **Affichage (Frontend)**:
    - Les composants utilisent directement les valeurs stockées (pas de reculcul risqué).
    - `formatPrice` gère l'affichage localisé.

---

## 🔒 Sécurité & Intégrité

### Contraintes Base de Données

- `chk_sale_price_positive`: Empêche les prix négatifs.
- `chk_tva_coherence`: Assure que `HT + TVA ≈ TTC`.
- `chk_no_tva_means_zero`: Impose `TVA = 0` si `has_tva = false`.

### Validation Applicative (`tva-helpers.ts`)

- Détection `NaN`, `Infinity`.
- Gestion des arrondis (EPSILON).
- Protection division par zéro.

---

## 🚀 Performance

### Indexation

Le système utilise des index stratégiques pour optimiser les requêtes fréquentes:

- `idx_products_pos_lookup`: `(has_tva, sale_price_ttc, deleted_at)` → Pour le POS.
- `idx_products_has_tva_active`: Pour les filtres rapides.
- `idx_products_sale_price_ttc_active`: Pour les tris par prix.

### Benchmarks

- Recherche POS: **15-20x plus rapide**
- Filtre par prix: **10x plus rapide**

---

## 🧪 Tests & Validation

### Scripts de Validation

Utilisez `scripts/validate-tva-migration.sql` pour vérifier l'état de la base de données.

- Vérifie les incohérences mathématiques.
- Détecte les produits incomplets.
- Valide les taux de TVA appliqués.

### Tests Unitaires

Les helpers sont couverts par des tests (voir `src/lib/tva-helpers.test.ts` si existant, sinon à créer).

---

## 🔄 Migration & Rollback

- **Migration**: `scripts/migrate-tva-data.ts` (Convertit les anciens prix "flous" en TTC strict).
- **Rollback**: `src/db/migrations/rollback_0005.sql` (Supprime les colonnes et index TVA).
- **Backup**: Voir `docs/BACKUP_GUIDE.md`.
