# 🎨 OptiManager Pro 3 - Guide de Design & UX

## 📱 Présentation du Projet

**OptiManager Pro 3** est une application SaaS de gestion complète dédiée aux **Opticiens**.
L'objectif est de digitaliser entièrement le magasin d'optique, de la gestion des stocks à la facturation, en passant par le suivi médical des patients.

**Cible (Persona) :** L'Opticien Lunetier. Il est à la fois un professionnel de santé et un commerçant. Il a besoin de précision, de rapidité, et d'une interface qui inspire confiance à ses clients.

---

## 🧭 Structure de l'Application

### 1. 🏠 Tableau de Bord (Dashboard)

- **But :** Vue d'ensemble immédiate de l'activité.
- **KPIs Clés :** Chiffre d'Affaires du jour/mois, Nouveaux clients, Commandes en cours.
- **Design Focus :** Clarté, graphiques épurés (Recharts), alertes visibles mais non intrusives (Rappels stock).

### 2. 👥 Clients (Dossiers Patients)

- **But :** Cœur du métier. Gérer l'historique médical et commercial.
- **Fonctionnalités :**
  - Recherche rapide.
  - Historique des achats (Lunettes, Lentilles).
  - Données médicales (Correction OD/OG - Sphère, Cylindre, Axe...).
- **UX Focus :** La saisie des corrections (Ordonnances) doit être ergonomique et sans erreur.

### 3. 📦 Stock & Produits

- **But :** Gérer l'inventaire (Montures, Verres, Lentilles, Accessoires).
- **Fonctionnalités :**
  - Scan code-barres.
  - Alertes stock bas.
  - Gestion des variantes (Couleurs, Marques).
- **UX Focus :** Listes filtrables, actions rapides, badges de statut visuels.

### 4. 📄 Devis (Quotes)

- **But :** Créer des propositions commerciales avant la vente.
- **Fonctionnalités :**
  - Transformation en Facture en 1 clic.
  - Impression A4 professionnelle.
  - Calcul automatique TVA/Remises.

### 5. 🧾 Ventes (Factures)

- **But :** Finaliser la transaction et suivre les paiements.
- **Fonctionnalités :**
  - Suivi des paiements (Payé, Partiel, Impayé).
  - Gestion des restes à payer.
  - Impression ticket ou A4.

### 6. 🚚 Fournisseurs (Suppliers)

- **But :** Gérer les commandes d'achat de matériel.
- **UX Focus :** Suivi des commandes fournisseurs (Envoyée, Reçue) pour mettre à jour le stock automatiquement.

### 7. 📊 Comptabilité (Rapports)

- **But :** Analyse financière.
- **Fonctionnalités :** Exports Excel, Rapports mensuels pour le comptable.

### 8. 🔔 Rappels

- **But :** Ne rien oublier (Retrait commande client, Ravitaillement stock, Paiements fournisseurs).

### 9. ⚙️ Paramètres

- **But :** Personnalisation du magasin.
- **Clé :** Configuration des mentions légales (ICE, RC, IF) qui apparaissent sur les factures.

---

## 🎨 Lignes Directrices de Design (Guidelines)

### ✨ Ambiance & Style

- **Professionnel & Médical :** Utilisation de l'espace blanc (White space), typographie lisible (Inter/Sans-serif).
- **Confiance :** Couleurs rassurantes (Bleu médical, Gris neutre) avec des accents vifs pour les actions (Boutons primaires).
- **Moderne :** Ombres douces (Soft shadows), coins arrondis (Rounded corners), transitions fluides.

### 🛑 À éviter

- **Surcharger l'écran :** L'opticien travaille souvent debout ou avec un client. L'information doit être scannable.
- **Contrastes faibles :** Accessibilité critique.
- **Pop-ups intrusives :** Privilégier les Dialogues modaux contextuels ou les Toasts non bloquants.

### 🖨️ Le Système d'Impression

Un point critique est la génération des **PDFs (Devis/Factures)**.
Le design papier doit être **minimaliste, légalement conforme, et élégant**. Il représente l'image de marque de l'opticien auprès de ses clients.
