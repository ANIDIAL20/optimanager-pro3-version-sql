-- ====================================
-- 🧪 TVA MIGRATION VALIDATION SUITE
-- OptiManager Pro 3
-- Date: 2026-02-15
-- ====================================
-- 
-- Purpose: Verify data integrity after TVA migration
-- Usage: psql -U postgres -d optimanager_db -f scripts/validate-tva-migration.sql
--
-- Expected: All tests should return 0 errors
-- ====================================

\set ON_ERROR_STOP on
\timing on

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🧪 TVA MIGRATION VALIDATION - OptiManager Pro'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- TEST 1: NULL VALUES CHECK
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 TEST 1: Vérification des valeurs NULL'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Recherche de produits avec champs TVA manquants...'

SELECT 
  COUNT(*) as "⚠️ Produits incomplets",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Aucun produit incomplet'
    ELSE '❌ FAIL - Produits avec données manquantes détectés'
  END as "Statut"
FROM products
WHERE (
  sale_price_ht IS NULL 
  OR sale_price_tva IS NULL 
  OR sale_price_ttc IS NULL
  OR has_tva IS NULL
  OR price_type IS NULL
)
AND deleted_at IS NULL;

\echo ''
\echo '  Détail des produits incomplets (si présents):'

SELECT 
  id,
  reference,
  nom,
  sale_price_ht IS NULL as "HT manquant",
  sale_price_tva IS NULL as "TVA manquante",
  sale_price_ttc IS NULL as "TTC manquant"
FROM products
WHERE (
  sale_price_ht IS NULL 
  OR sale_price_tva IS NULL 
  OR sale_price_ttc IS NULL
)
AND deleted_at IS NULL
LIMIT 10;

-- ============================================
-- TEST 2: MATHEMATICAL COHERENCE
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🧮 TEST 2: Cohérence mathématique (HT + TVA = TTC)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Calcul des écarts HT+TVA vs TTC...'

WITH coherence_check AS (
  SELECT 
    id,
    reference,
    nom,
    sale_price_ht,
    sale_price_tva,
    sale_price_ttc,
    (sale_price_ht + sale_price_tva) as ht_plus_tva,
    ABS((sale_price_ht + sale_price_tva) - sale_price_ttc) as ecart
  FROM products
  WHERE deleted_at IS NULL
)
SELECT 
  COUNT(*) as "⚠️ Produits incohérents",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Tous les calculs sont cohérents'
    ELSE '❌ FAIL - Incohérences mathématiques détectées'
  END as "Statut"
FROM coherence_check
WHERE ecart > 0.02;  -- Tolérance: 2 centimes

\echo ''
\echo '  Top 10 des produits avec plus grand écart:'

SELECT 
  id,
  reference,
  nom,
  ROUND(sale_price_ht::numeric, 2) as "HT",
  ROUND(sale_price_tva::numeric, 2) as "TVA",
  ROUND(sale_price_ttc::numeric, 2) as "TTC",
  ROUND((sale_price_ht + sale_price_tva)::numeric, 2) as "HT+TVA",
  ROUND(ABS((sale_price_ht + sale_price_tva) - sale_price_ttc)::numeric, 4) as "⚠️ Écart"
FROM products
WHERE deleted_at IS NULL
ORDER BY ABS((sale_price_ht + sale_price_tva) - sale_price_ttc) DESC
LIMIT 10;

-- ============================================
-- TEST 3: NEGATIVE PRICES
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '💰 TEST 3: Vérification des prix négatifs'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Recherche de prix négatifs ou invalides...'

SELECT 
  COUNT(*) as "⚠️ Prix négatifs",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Aucun prix négatif'
    ELSE '❌ FAIL - Prix négatifs détectés'
  END as "Statut"
FROM products
WHERE (
  sale_price_ht < 0 
  OR sale_price_tva < 0 
  OR sale_price_ttc < 0
)
AND deleted_at IS NULL;

\echo ''
\echo '  Détail des produits avec prix négatifs:'

SELECT 
  id,
  reference,
  nom,
  ROUND(sale_price_ht::numeric, 2) as "HT",
  ROUND(sale_price_tva::numeric, 2) as "TVA",
  ROUND(sale_price_ttc::numeric, 2) as "TTC"
FROM products
WHERE (
  sale_price_ht < 0 
  OR sale_price_tva < 0 
  OR sale_price_ttc < 0
)
AND deleted_at IS NULL
LIMIT 10;

-- ============================================
-- TEST 4: TVA RATE ACCURACY
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 TEST 4: Vérification du taux de TVA'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Analyse des taux de TVA calculés...'

WITH tva_rates AS (
  SELECT 
    id,
    reference,
    nom,
    sale_price_ht,
    sale_price_tva,
    has_tva,
    CASE 
      WHEN sale_price_ht > 0 THEN 
        ROUND((sale_price_tva / sale_price_ht * 100)::numeric, 2)
      ELSE 0
    END as taux_calcule
  FROM products
  WHERE deleted_at IS NULL
    AND has_tva = true
    AND sale_price_ht > 0
)
SELECT 
  COUNT(*) as "⚠️ Taux TVA aberrants",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Tous les taux sont corrects (~20%)'
    ELSE '❌ FAIL - Taux de TVA anormaux détectés'
  END as "Statut"
FROM tva_rates
WHERE taux_calcule < 19.5 OR taux_calcule > 20.5;  -- Tolérance: 19.5% à 20.5%

\echo ''
\echo '  Distribution des taux de TVA:'

SELECT 
  CASE 
    WHEN sale_price_ht = 0 THEN '0% (prix nul)'
    WHEN (sale_price_tva / sale_price_ht * 100) < 19.5 THEN '< 19.5% (anormal)'
    WHEN (sale_price_tva / sale_price_ht * 100) BETWEEN 19.5 AND 20.5 THEN '20% (normal)'
    WHEN (sale_price_tva / sale_price_ht * 100) > 20.5 THEN '> 20.5% (anormal)'
  END as "Tranche de taux",
  COUNT(*) as "Nombre de produits"
FROM products
WHERE deleted_at IS NULL
  AND has_tva = true
GROUP BY 
  CASE 
    WHEN sale_price_ht = 0 THEN '0% (prix nul)'
    WHEN (sale_price_tva / sale_price_ht * 100) < 19.5 THEN '< 19.5% (anormal)'
    WHEN (sale_price_tva / sale_price_ht * 100) BETWEEN 19.5 AND 20.5 THEN '20% (normal)'
    WHEN (sale_price_tva / sale_price_ht * 100) > 20.5 THEN '> 20.5% (anormal)'
  END
ORDER BY "Tranche de taux";

-- ============================================
-- TEST 5: EXEMPTED PRODUCTS
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🏥 TEST 5: Vérification des produits exonérés'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Recherche de produits exonérés avec TVA non-nulle...'

SELECT 
  COUNT(*) as "⚠️ Exonérés avec TVA",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Tous les exonérés ont TVA = 0'
    ELSE '❌ FAIL - Produits exonérés avec TVA détectés'
  END as "Statut"
FROM products
WHERE has_tva = false
  AND sale_price_tva != 0
  AND deleted_at IS NULL;

\echo ''
\echo '  Statistiques produits exonérés:'

SELECT 
  COUNT(*) as "Total exonérés",
  COUNT(CASE WHEN sale_price_tva = 0 THEN 1 END) as "Avec TVA = 0 (correct)",
  COUNT(CASE WHEN sale_price_tva != 0 THEN 1 END) as "Avec TVA ≠ 0 (incorrect)"
FROM products
WHERE has_tva = false
  AND deleted_at IS NULL;

-- ============================================
-- TEST 6: PRICE TYPE VALIDITY
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🏷️ TEST 6: Validation du type de prix'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Vérification des valeurs price_type...'

SELECT 
  COUNT(*) as "⚠️ Type de prix invalide",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Tous les types sont valides (HT ou TTC)'
    ELSE '❌ FAIL - Types de prix invalides détectés'
  END as "Statut"
FROM products
WHERE price_type NOT IN ('HT', 'TTC')
  AND deleted_at IS NULL;

\echo ''
\echo '  Distribution des types de prix:'

SELECT 
  price_type as "Type",
  COUNT(*) as "Nombre de produits",
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 2) as "Pourcentage"
FROM products
WHERE deleted_at IS NULL
GROUP BY price_type
ORDER BY COUNT(*) DESC;

-- ============================================
-- TEST 7: ZERO PRICES
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '⚠️ TEST 7: Détection des prix à zéro'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '  Recherche de produits gratuits (prix = 0)...'

SELECT 
  COUNT(*) as "Produits à 0 DH",
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING - Produits gratuits détectés (à vérifier)'
    ELSE '✅ OK - Aucun produit gratuit'
  END as "Statut"
FROM products
WHERE sale_price_ttc = 0
  AND deleted_at IS NULL;

\echo ''
\echo '  Liste des produits gratuits:'

SELECT 
  id,
  reference,
  nom,
  sale_price_ttc as "Prix TTC"
FROM products
WHERE sale_price_ttc = 0
  AND deleted_at IS NULL
LIMIT 10;

-- ============================================
-- SUMMARY STATISTICS
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 RÉSUMÉ - Statistiques de Migration'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  COUNT(*) as "Total produits actifs",
  COUNT(CASE WHEN has_tva = true THEN 1 END) as "Avec TVA 20%",
  COUNT(CASE WHEN has_tva = false THEN 1 END) as "Exonérés (0%)",
  ROUND((COUNT(CASE WHEN has_tva = true THEN 1 END) * 100.0 / COUNT(*))::numeric, 1) as "% avec TVA",
  COUNT(CASE WHEN price_type = 'TTC' THEN 1 END) as "Saisis en TTC",
  COUNT(CASE WHEN price_type = 'HT' THEN 1 END) as "Saisis en HT",
  ROUND(AVG(sale_price_ttc)::numeric, 2) as "Prix moyen TTC (DH)",
  ROUND(MIN(sale_price_ttc)::numeric, 2) as "Prix min TTC (DH)",
  ROUND(MAX(sale_price_ttc)::numeric, 2) as "Prix max TTC (DH)"
FROM products
WHERE deleted_at IS NULL;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ VALIDATION TERMINÉE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Examinez les résultats ci-dessus:'
\echo '  ✅ Tous les tests doivent afficher PASS'
\echo '  ❌ Si FAIL détecté → Corriger avant production'
\echo '  ⚠️ Les warnings nécessitent une vérification manuelle'
\echo ''
\echo 'En cas de problème, référez-vous à docs/ROLLBACK_GUIDE.md'
\echo ''
