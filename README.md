<<<<<<< HEAD
# OptiManager Pro 3 🚀

Application de gestion professionnelle construite avec Next.js et Firebase.

## 📋 Description

OptiManager Pro 3 est une application SaaS complète pour la gestion d'entreprise, incluant :

- 🔐 **Authentification sécurisée** avec Firebase Auth
- 👥 **Gestion des clients** et des utilisateurs
- 📊 **Dashboard administrateur** pour le Super Admin
- 💼 **Gestion des abonnements** et des plans
- 🎨 **Interface moderne** avec animations et design premium

## 🛠️ Technologies

- **Framework** : Next.js 16 (App Router)
- **Backend** : Firebase (Auth, Firestore, Admin SDK)
- **UI** : React 19, Tailwind CSS, Radix UI
- **Animations** : Framer Motion
- **Formulaires** : React Hook Form + Zod
- **Charts** : Recharts

## 📦 Installation

```powershell
# Cloner le projet
git clone <votre-repo>
cd optimanager-pro3

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Copiez .env.local.example vers .env.local et remplissez les valeurs
```

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=votre_measurement_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=votre_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=votre_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=votre_private_key
```

## 🚀 Développement

```powershell
# Démarrer le serveur de développement
npm run dev

# Ouvrir http://localhost:3000
```

### Scripts Disponibles

- `npm run dev` - Démarrer le serveur de développement avec Turbopack
- `npm run build` - Build de production
- `npm run start` - Démarrer le serveur de production
- `npm run lint` - Linter le code
- `npm run typecheck` - Vérifier les types TypeScript

## 📤 Déploiement

### Option 1 : Firebase Hosting (Recommandé)

```powershell
# Utiliser le script automatisé
.\deploy.ps1
```

**OU manuellement :**

```powershell
# Se connecter à Firebase
firebase login

# Build et déploiement
npm run build
firebase deploy --only hosting
```

### Option 2 : Vercel

```powershell
# Utiliser le script automatisé
.\deploy-vercel.ps1
```

**OU manuellement :**

```powershell
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel --prod
```

### Configuration Post-Déploiement

1. **Autoriser le domaine dans Firebase** :
   - Allez sur [Firebase Console](https://console.firebase.google.com)
   - Authentication → Settings → Authorized domains
   - Ajoutez votre domaine de production

2. **Configurer les variables d'environnement** :
   - Pour Firebase : Créez `.env.production`
   - Pour Vercel : Ajoutez les variables dans le dashboard

3. **Vérifier les règles Firestore** :
   - Assurez-vous que `firestore.rules` est configuré correctement

## 🔒 Sécurité

- ✅ Headers de sécurité configurés (CSP, HSTS, X-Frame-Options)
- ✅ Authentification Firebase sécurisée
- ✅ Règles Firestore pour la protection des données
- ✅ Variables d'environnement pour les secrets

## 📚 Documentation

- [Guide de Déploiement Complet](./docs/deployment_guide.md)
- [Documentation Firebase](https://firebase.google.com/docs)
- [Documentation Next.js](https://nextjs.org/docs)

## 🤝 Support

Pour toute question ou problème :

1. Consultez la documentation
2. Vérifiez les issues GitHub
3. Contactez l'équipe de développement

## 📄 Licence

Propriétaire - Tous droits réservés

---

**Projet** : OptiManager Pro 3  
**Version** : 0.1.0 (Updated: 2025-12-31)
**Firebase Project** : optimanager-pro-3-34449

=======
# optimanager-pro3-version-sql
>>>>>>> 4e872fddc92746a9e57936f6d63f478ff76a129c
