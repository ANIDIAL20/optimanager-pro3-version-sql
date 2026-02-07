# Guide de Migration vers le Système Unifié

## Fichiers créés

### Infrastructure

1. **`src/contexts/loading-context.tsx`** - Context React global pour l'état de chargement
2. **`src/lib/action-cache.ts`** - Système de cache intelligent avec LRU/TTL
3. **`src/components/ui/unified-loader.tsx`** - Composant de loading unifié
4. **`src/app/layout.tsx`** (modifié) - Intégration du LoadingProvider

### Documentation

5. **`docs/migration-guide.md`** - Guide avec exemples avant/après

## Prochaines Étapes

### Composants Prioritaires à Migrer

1. **Dashboard** (`src/app/dashboard/_components/dashboard-client.tsx`)
   - État actuel: `isLoading` local
   - Bénéfice: Cache 5 min pour stats

2. **POS New Sale** (`src/app/dashboard/ventes/new/page.tsx`)
   - État actuel: Double loading `isLoadingProducts` + `isLoadingClients`
   - Bénéfice: Chargement parallèle + cache

3. **Client POS Tab** (`src/components/clients/client-pos-tab.tsx`)
   - État actuel: `isLoading` local
   - Bénéfice: Cache categories/products

## Actions à Effectuer

### Pour chaque composant:

```bash
# 1. Ouvrir le composant
# 2. Identifier les patterns:
#    - useState(Loading)
#    - useEffect avec fetch
#    - <BrandLoader> ou <Skeleton>
# 3. Remplacer par useServerAction
# 4. Tester
```

### Commandes de Test

```bash
# Vérifier que tout compile
npm run build

# Tester en dev
npm run dev

# Voir le cache stats (console navigateur)
import { getCacheStats } from '@/lib/action-cache'
console.log(getCacheStats())
```

## Système Maintenant Actif

✅ **LoadingProvider** - Actif dans `layout.tsx`
✅ **UnifiedLoader** - S'affiche coin supérieur droit
✅ **Cache System** - Prêt à l'utilisation
✅ **Hooks disponibles**:

- `useGlobalLoading(key)` - Contrôle manuel
- `useServerAction(key, action, options)` - Auto avec cache
