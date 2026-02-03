# OptiManager Pro 3 (SQL Version) 🚀

Application de gestion professionnelle pour opticiens, construite avec **Next.js 16**, **PostgreSQL (Neon)**, et **Drizzle ORM**.

## 📋 Description

OptiManager Pro 3 est une solution SaaS complète pour la gestion de magasin d'optique, incluant :

- 🔐 **Authentification unifiée** avec Auth.js (Email/Password) et Google.
- 👥 **Gestion des Clients** (Historique médical, Ordonnances, Lentilles).
- 📦 **Gestion de Stock & Produits** (Codes-barres, Alertes stock).
- 💰 **Ventes & Facturation** (Devis, Factures, Paiements, Bons de livraison).
- 🖨️ **Système d'Impression Pro** (Format A4, Mentions légales, Design épuré).
- 📊 **Tableau de Bord** (Chiffre d'affaires, Mouvements, Statistiques).

## 🛠️ Technologies

- **Framework** : Next.js 16 (App Router)
- **Base de Données** : PostgreSQL (Neon Serverless)
- **ORM** : Drizzle ORM
- **Authentification** : Auth.js (NextAuth v5)
- **UI** : React 19, Tailwind CSS, Shadcn UI, Radix UI
- **PDF/Print** : Custom CSS Print System (@media print)

## 📦 Installation & Démarrage

```powershell
# Installer les dépendances
npm install

# Configurer la base de données (Push schema)
npx drizzle-kit push

# Démarrer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) pour voir l'application.

## 🗃️ Base de Données

Le projet utilise **Drizzle ORM** pour gérer la base de données PostgreSQL.

- **Schema** : `src/db/schema.ts`
- **Migrations** : `drizzle/` (si activé) or `drizzle-kit push`
- **Studio** : `npx drizzle-kit studio` (pour voir la DB dans le navigateur)

## 🖨️ Impression (Factures & Devis)

Le système d'impression a été récemment refondu pour :

- Supporter le format A4 natif.
- Inclure les mentions légales (ICE, RC, IF, Patente).
- Gérer les sauts de page et éviter les pages blanches.
- Fonctionner via un bouton "Lancer l'impression" avec prévisualisation.

## 📄 Licence

Propriétaire - Tous droits réservés.
OptiManager Pro 3.
