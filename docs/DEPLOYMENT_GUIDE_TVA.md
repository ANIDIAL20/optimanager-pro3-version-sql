# 🚀 Guide de Déploiement - Système Smart TVA

Ce guide est destiné aux **administrateurs** et **développeurs** qui doivent mettre en production le nouveau système TVA.

## État Initial

- Base de données sans colonnes TVA
- Application en cours d'exécution
- Code source **SANS** les dernières modifications TVA

## Étapes de Déploiement

### 1. ⚠️ **Sauvegarde (CRITIQUE)**

Créer une sauvegarde complète de la production:
`docs/BACKUP_GUIDE.md`

### 2. Arrêt du Serveur (Recommandé)

Arrêtez l'application pour éviter les conflits d'écriture si possible.
`npm stop` ou équivalent.

### 3. Migration du Code

Utilisez `git pull` pour récupérer les changements.

```bash
git fetch origin
git pull
```

### 4. Migration de la Base de Données (Schéma)

Appliquez les changements de schéma avec Drizzle:

```bash
npm run db:push
```

_Vérifiez qu'aucun message d'erreur n'apparaît._

### 5. Migration des Données (Script)

Remplissez les nouvelles colonnes pour les produits existants:

```bash
npx tsx scripts/migrate-tva-data.ts
```

_Attendez la confirmation: "✅ Migration completed successfully."_

### 6. Validation des Données

Exécutez le script de validation:

```bash
psql $DATABASE_URL -f scripts/validate-tva-migration.sql
```

_Vérifiez que tous les tests sont "PASS"._

### 7. Ajout des Contraintes (Protection)

Appliquez les contraintes d'intégrité:

```bash
psql $DATABASE_URL -f src/db/migrations/0006_add_tva_constraints.sql
```

### 8. Ajout des Index (Performance)

Optimisez les requêtes:

```bash
psql $DATABASE_URL -f src/db/migrations/0007_add_tva_indexes.sql
```

_Lancez `ANALYZE products;` à la fin._

### 9. Redémarrage

Démarrez l'application:

```bash
npm run build
npm start
```

### 10. Vérification Finale

- [ ] Connectez-vous en tant qu'admin
- [ ] Créez un nouveau produit TTC
- [ ] Créez une vente test
- [ ] Vérifiez le ticket de caisse

---

## 🛑 En cas de PROBLÈME

Si l'application plante ou les données semblent corrompues après l'étape 5, suivez **immédiatement** la procédure `Rollback` décrite dans `docs/ROLLBACK_GUIDE.md`.

Ne laissez pas une migration partiellement échouée en production.
