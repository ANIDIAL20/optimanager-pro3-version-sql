# Google Gemini Invoice Scanner Setup

## Configuration Requise

### 1. Clé API Google Gemini

Obtenez votre clé API gratuite sur [Google AI Studio](https://makersuite.google.com/app/apikey).

### 2. Variables d'Environnement

Ajoutez dans `.env.local`:

```bash
# Google Gemini API
GOOGLE_API_KEY=votre-cle-api-gemini

# Firebase Admin (déjà configurées normalement)
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_CLIENT_EMAIL=votre-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Installation

La librairie est déjà installée:
```bash
npm install @google/generative-ai
```

### 4. Redémarrage

Après avoir ajouté la clé API:
```bash
npm run dev
```

## Utilisation

1. **Accédez à la page Produits** (`/produits`)
2. **Cliquez sur "📸 Scanner Facture (Gemini)"**
3. **Sélectionnez une image** de facture (JPG/PNG)
4. **Attendez l'analyse** (~3-5 secondes)
5. **Vérifiez le toast** pour confirmation

## Fonctionnalités

### ✅ Traitement Intelligent
- **Extraction IA** : Gemini 1.5 Flash analyse l'image
- **Compression automatique** : Images >2MB réduites
- **Base64 in-memory** : Aucun stockage d'images

### ✅ Anti-Doublons (Smart Upsert)
- **Si référence existe** : Stock incrémenté (`increment`)
- **Si nouvelle référence** : Nouveau produit créé
- **Batch atomique** : Tout ou rien

### ✅ Extraction Intelligente
- Référence produit
- Marque
- Couleur/variant
- Catégorie (Solaire/Vue/Lentilles/Accessoires)
- Prix d'achat
- Quantité (défaut: 1)

## Coûts

**Gemini 1.5 Flash** : GRATUIT jusqu'à 15 requêtes/minute
- Pas de limite de stockage
- Pas de coût par image
- Idéal pour petits volumes (<1000 factures/mois)

## Dépannage

### Erreur "API Key invalide"
- Vérifiez que `GOOGLE_API_KEY` est défini dans `.env.local`
- Redémarrez le serveur de dev

### "No products found"
- Vérifiez que la facture est lisible
- Essayez avec une image de meilleure qualité
- Assurez-vous que les produits sont clairement visibles

### Import échoue
- Vérifiez les logs de console pour les erreurs Firestore
- Assurez-vous que Firebase Admin est correctement configuré
