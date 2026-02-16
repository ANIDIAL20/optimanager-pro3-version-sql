# Changelog - Smart TVA System

## [1.0.0] - 2026-02-15

### Ajouté

- **Système TVA Complet**: Support natif des prix HT, TTC et TVA (20%).
- **Colonnes Database**: `sale_price_ht`, `sale_price_tva`, `sale_price_ttc`, `has_tva`, `price_type`, `exemption_note`.
- **Formulaire Produit**:
  - Sélecteur "Type de Prix" (HT/TTC).
  - Case à cocher "Soumis à TVA".
  - Calcul automatique en temps réel des taxes.
- **Migration de Données**: Script `migrate-tva-data.ts` pour convertir l'existant.
- **Sécurité**:
  - Contraintes SQL (`CHECK`) pour empêcher les prix négatifs et incohérents.
  - Validation stricte dans le code (`tva-helpers.ts`).
- **Performance**:
  - Index partiels pour le filtrage rapide (`has_tva`, `price_type`).
  - Index composites pour le Point de Vente (`idx_products_pos_lookup`).
- **Documentation**: Guides complets (Utilisateur, Admin, Dev, Dépannage).

### Modifié

- **Calcul des Prix**: Standardisé via `calculatePrices` (arrondi 2 décimales, gestion EPSILON).
- **Création de Vente**: Logique de vente refondue pour utiliser les prix stockés (plus de calcul magique "x 1.2").
- **Import en Masse**: Support des colonnes TVA par défaut.

### Corrigé

- **Bug**: Surfacturation potentielle due à l'ajout systématique de 20% sur les prix déjà TTC.
- **Bug**: Impossibilité de vendre des produits exonérés (médicaments).
- **Bug**: Incohérences d'arrondi sur les centimes.

### Supprimé

- **Logique**: Calcul dynamique de la TVA lors de la vente (remplacé par lecture directe).
- **Risque**: Saisie de prix négatifs (bloqué par la base de données).

---

## Migration

Pour mettre à jour vers cette version, voir `docs/DEPLOYMENT_GUIDE_TVA.md`.
