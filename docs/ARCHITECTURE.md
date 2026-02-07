# Architecture OptiManager Pro

## État actuel – Problèmes identifiés

### Backend (problèmes)

| Problème | Détail |
|----------|--------|
| **Deux systèmes d'actions** | `secureAction` (lib) vs `createAction` + `compose` (features) |
| **Actions dispersées** | 24+ fichiers dans `app/actions/`, plus `features/*/actions.ts` |
| **Doublons domaines** | `clients-actions` vs `clientManagementActions` vs `features/clients` |
| **Shop fragmenté** | `shop-actions` (getShopProfile) vs `shop-settings-actions` (getShopSettings) |
| **Legacy Firebase** | `src/actions/client-actions.ts`, `clientManagementActions` encore sur Firestore |
| **Imports incohérents** | `getClients` tantôt de `app/actions`, tantôt de `features` |

### Frontend (problèmes)

| Problème | Détail |
|----------|--------|
| **QuickClientDialog en double** | `dashboard/commandes/` et `sales/` – API différente |
| **ClientSelector vs product-selector** | Logique similaire dans plusieurs composants |
| **Composants éparpillés** | `dashboard/clients`, `clients/`, `dashboard/commandes` mélangés |

---

## Architecture cible – Structure simplifiée

```
src/
├── lib/                      # Utilitaires, auth, DB
│   ├── auth.ts
│   ├── secure-action.ts      # Wrapper unique pour server actions
│   ├── db/
│   └── cache/
│
├── server/                   # Backend unifié
│   └── actions/
│       ├── clients.ts        # CRUD clients (remplace clients-actions)
│       ├── sales.ts          # Ventes (remplace sales-actions)
│       ├── products.ts       # Produits (remplace products-actions)
│       ├── devis.ts          # Devis
│       ├── suppliers.ts      # Fournisseurs
│       ├── settings.ts       # Shop + paramètres (fusion shop + shop-settings + settings)
│       ├── admin.ts          # Admin (adminActions + clientManagement)
│       ├── dashboard.ts      # Stats dashboard
│       └── ...
│
├── app/                      # Routes Next.js (pages fines)
│   ├── dashboard/
│   ├── api/
│   └── ...
│
└── components/               # UI par domaine
    ├── ui/                   # Primitives (shadcn)
    ├── clients/              # Formulaires, liste, actions clients
    ├── sales/                # Ventes, commandes, factures
    ├── products/             # Produits, stock
    ├── settings/             # Paramètres boutique
    └── shared/               # Composants réutilisables (QuickClientDialog, etc.)
```

---

## Principes

1. **Une source de vérité par domaine** : un seul fichier d’actions par domaine (ex. `clients.ts`).
2. **`secureAction` partout** : utiliser uniquement ce wrapper pour l’auth.
3. **Suppression du legacy** : retirer Firebase pour les domaines migrés (clients, products, sales).
4. **Composants partagés** : un seul `QuickClientDialog` dans `shared/` ou `clients/`.
5. **Imports cohérents** : toujours importer les actions depuis `@/server/actions/*`.

---

## Plan de migration (recommandé)

### Phase 1 – Nettoyage rapide
- [x] Supprimer `src/actions/client-actions.ts` (Firebase, non utilisé)
- [x] Fusionner les deux `QuickClientDialog` en un composant unique → `components/clients/quick-client-dialog.tsx`
- [ ] Aligner tous les imports `getClients`/`createClient` sur une seule source (voir Phase 2)

### Phase 2 – Consolidation backend
- [ ] Créer `server/actions/` et migrer les actions domaine par domaine
- [ ] Fusionner `shop-actions` + `shop-settings-actions` → `settings.ts`
- [ ] Migrer `clientManagementActions` vers Neon ou le garder dans `admin.ts` si besoin Firebase Auth

### Phase 3 – Frontend
- [ ] Regrouper les composants par domaine
- [ ] Supprimer les doublons (`client-selector` vs `product-selector` si redondants)

---

## Mapping des actions actuelles → cibles

| Actuel | Cible |
|--------|-------|
| `app/actions/clients-actions.ts` | `server/actions/clients.ts` |
| `app/actions/sales-actions.ts` | `server/actions/sales.ts` |
| `app/actions/products-actions.ts` | `server/actions/products.ts` |
| `app/actions/shop-actions.ts` + `shop-settings-actions` | `server/actions/settings.ts` |
| `app/actions/settings-actions.ts` | `server/actions/settings.ts` |
| `features/*/actions.ts` | Migrer vers `server/actions/` ou supprimer si doublon |
| `src/actions/client-actions.ts` | Supprimer (legacy Firebase) |
