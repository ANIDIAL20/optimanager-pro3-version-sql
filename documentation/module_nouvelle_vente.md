# Documentation du Module "Nouvelle Vente" (POS v2)

Ce document détaille la structure technique et l'expérience utilisateur (UX/UI) du module de vente refactorisé.

## 1. Vue d'Ensemble

Le module "Nouvelle Vente" permet d'encaisser des produits en stock (montures, accessoires) et de configurer des "Packs Verres" sur mesure. Il orchestre la création simultanée d'une vente, d'une ordonnance et d'une commande de verres fournisseur.

---

## 2. Structure Frontend (React / Next.js)

### A. Espace de Travail & Navigation

**Fichier :** `src/app/dashboard/ventes/new/page.tsx`

- **Segmented Control Navigation :** L'interface de sélection (70% de l'écran) utilise un système d'onglets de type "contrôle segmenté" (bg-slate-100, coins arrondis 2xl).
  - `👁️ Mesures & Verres` : Saisie technique pour les ventes optiques.
  - `📦 Catalogue Produits` : Ajout de produits physiques depuis le stock.
- **Nettoyage Interface :** Les anciens boutons redondants "Mesures & Verres" à l'extérieur de la zone de travail ont été supprimés pour éviter la confusion.

### B. Formulaire Clinique : `SaisieMesuresVerres`

**Fichier :** `src/components/sales/saisie-mesures-verres.tsx`

- **Interface Haute-Précision :**
  - **Contraste Œil Droit / Œil Gauche :** Utilisation de codes couleurs distincts (Bleu pour OD, Émeraude pour OG) pour réduire les erreurs de saisie.
  - **Compact Grid (4 colonnes) :** Les mesures principales (Sphère, Cylindre, Axe, Addition) sont sur une seule ligne.
- **Logique Métier :** Détection automatique de la géométrie du verre (Progressif, Unifocal) via des mots-clés.
- **Action Boutique :** Un bouton d'action large et indigo avec icône de caddie pour injecter les données dans le panier global.

### C. Panier Intelligent & Feedback

- **Visualisation des Mesures :** Les items de type "Pack Verre" affichent un badge interactif `👁️ Voir mesures`. Au clic, un **Popover Radix UI** affiche le résumé complet de l'ordonnance et du fournisseur sans quitter la page.
- **Feedback d'Encaissement :**
  - **Loading State :** Spinner actif sur le bouton lors de la validation (`createSale`).
  - **Toasts de Succès :** Notification verte (`bg-emerald-600`) confirmant la réussite de la vente et de la commande fournisseur.

---

## 3. Structure Backend (Drizzle ORM / Server Actions)

### A. Action Serveur : `createSale`

**Fichier :** `src/app/actions/sales-actions.ts`

La logique est encapsulée dans une **transaction SQL atomique** :

1.  **Vérification Stock :** Décrémente les quantités pour les produits physiques.
2.  **Insertion Vente :** Crée l'enregistrement dans la table `sales` avec les métadonnées normalisées.
3.  **Traitement des Packs Complexes :**
    - **Ordonnance :** Insertion dans `prescriptionsLegacy` (format JSON).
    - **Commande Verre :** Insertion dans `lensOrders` avec les liens `saleId` et `prescriptionId`.
4.  **Comptabilité Client :** Met à jour la balance et enregistre la transaction de paiement.

---

## 4. Schéma de Données

### Table `sales`

- `items` : Stockage JSON dénormalisé (Snapshot).
- `metadata` : Contient le flag `isComplexPack`.

### Table `lens_orders`

- `status` : Initialisé à `pending`.
- `sellingPrice` : Fige le prix de vente.
- `estimatedBuyingPrice` : Fige le prix d'achat au moment de la vente.
- `estimatedMargin` : Marge calculée (Selling - Buying) pour le reporting financier.
- `indice` : Indice du verre (1.5, 1.6...) extrait des métadonnées.

---

## 5. Architecture Technique (Sécurité & Intégrité)

### A. Type Safety (Discriminated Unions)

Le système utilise une structure de données stricte pour le panier :

- **SimpleLineItem** : Pour les produits physiques (Montures, Accessoires).
- **ComplexPackItem** : Spécifique aux verres, incluant obligatoirement `metadata.prescription` et `metadata.lensOrder`.

### B. Structure de l'Ordonnance (OD/OG)

Contrairement aux anciennes versions, les mesures sont séparées par œil pour une précision clinique maximale :

- `prescription.od` : { sph, cyl, axis, add, pd, hauteur }
- `prescription.og` : { sph, cyl, axis, add, pd, hauteur }

### C. Identifiants Uniques

Utilisation de `crypto.randomUUID()` pour les `lineId` du panier, évitant tout risque de collision lors de manipulations rapides dans l'interface.

---

## 5. Flux de Données (Workflow)

1.  **Saisie :** L'utilisateur configure le pack dans l'onglet clinique.
2.  **Injection Panier :** Item virtuel créé avec `metadata: { prescription, lensOrder, isComplexPack: true }`.
3.  **Validation :** Frontend -> `createSale` -> DB Transaction (Sales + Prescriptions + LensOrders).
4.  **Clôture :** Vidage du panier et redirection vers la vue facture.
