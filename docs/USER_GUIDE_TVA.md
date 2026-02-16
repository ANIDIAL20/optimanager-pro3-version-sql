# 🎓 Guide Utilisateur - Système TVA

## Pour qui est ce guide?

Ce guide est destiné aux **utilisateurs quotidiens** d'OptiManager Pro:

- Vendeurs au comptoir
- Gestionnaires de stock
- Comptables
- Responsables magasin

---

## 📋 Table des Matières

1. [Qu'est-ce qui a changé?](#quest-ce-qui-a-changé)
2. [Créer un Produit](#créer-un-produit)
3. [Modifier un Produit](#modifier-un-produit)
4. [Point de Vente (POS)](#point-de-vente-pos)
5. [Factures et Comptabilité](#factures-et-comptabilité)
6. [Questions Fréquentes](#questions-fréquentes)

---

## 🆕 Qu'est-ce qui a changé?

### Avant (Ancien Système)

- ❌ Prix sans distinction HT/TTC
- ❌ TVA ajoutée automatiquement à 20% sur tout
- ❌ Impossible de créer produits exonérés
- ❌ Factures incorrectes (clients surfacturés)

### Maintenant (Nouveau Système)

- ✅ Choix clair: Prix HT ou TTC
- ✅ TVA calculée correctement selon le type
- ✅ Support produits exonérés (médicaments, etc.)
- ✅ Factures précises avec détail HT/TVA/TTC
- ✅ Conformité comptable

---

## ➕ Créer un Produit

### Étapes

1. **Aller à Produits → Nouveau Produit**

2. **Remplir les informations de base:**
   - Nom du produit
   - Référence (code-barres)
   - Catégorie
   - Fournisseur

3. **⭐ NOUVEAU: Configuration TVA**

   Vous verrez maintenant deux nouvelles options:

   #### Option 1: Type de Prix

   **Question:** "Le prix que vous allez saisir est-il HT ou TTC?"
   - **TTC (Recommandé)** = Prix affiché au client
     - _Exemple:_ Prix sur l'étiquette = 1200 DH → Saisir 1200 en TTC
   - **HT** = Prix avant TVA (pour comptabilité)
     - _Exemple:_ Vous savez que le prix HT est 1000 DH → Saisir 1000 en HT

   💡 **Conseil:** Si vous n'êtes pas sûr, choisissez **TTC** (c'est le prix que le client paye)

   #### Option 2: Produit Soumis à TVA

   **Question:** "Ce produit est-il soumis à la TVA (20%)?"
   - **☑ Coché (Par défaut)** = Produit normal avec TVA 20%
     - La majorité des produits optiques
   - **☐ Décoché** = Produit exonéré (sans TVA)
     - Médicaments ophtalmiques
     - Certains dispositifs médicaux
     - **Important:** Noter la raison d'exonération

4. **Saisir le Prix de Vente**
   - Tapez le montant
   - Le système calcule **automatiquement** HT, TVA, et TTC

   **Exemple concret:**
   - Vous tapez **1200 TTC**
   - Le système stocke:
     - HT: **1000.00 DH**
     - TVA (20%): **200.00 DH**
     - TTC: **1200.00 DH**

---

## ✏️ Modifier un Produit

Si vous devez corriger un prix ou changer le statut TVA d'un produit existant:

1. **Aller à Produits → Liste**
2. **Chercher le produit** et cliquer sur "Modifier" (icône ✏️)
3. **Vérifier les champs TVA**:
   - Si le produit a été créé avant la mise à jour, il est par défaut en **TTC** avec **TVA 20%**.
   - Vous pouvez changer le statut "Soumis à TVA" si nécessaire.
   - Vous verrez le détail calculé (HT / TVA / TTC) en temps réel.
4. **Enregistrer**.

⚠️ **Attention:** Si vous modifiez un prix, cela n'affecte pas les ventes passées, seulement les futures ventes.

---

## 🛒 Point de Vente (POS)

Au moment de la vente:

1. **Scanner ou Saisir le produit**:
   - Le prix affiché est toujours le **TTC** (ce que le client doit payer).
2. **Ticket de Caisse**:
   - Le ticket imprimé montrera désormais:
     - Le total HT
     - Le montant total de la TVA
     - Le total TTC à payer

   Ceci est obligatoire pour la conformité fiscale.

---

## 🧾 Factures et Comptabilité

### Pour les Factures

Les factures générées par le système sont maintenant conformes aux normes comptables marocaines, distinguant clairement:

- Montant Hors Taxe (HT)
- Taxe sur la Valeur Ajoutée (TVA) 20%
- Montant Toutes Taxes Comprises (TTC)

### Pour les Produits Exonérés

Si un produit est exonéré (TVA = 0%), la ligne de facture indiquera "Exonéré" ou "TVA 0%".

---

## ❓ Questions Fréquentes

**Q: J'ai des milliers de produits, dois-je tout modifier ?**
R: Non. La migration automatique a converti tous vos anciens prix en **Prix TTC avec TVA 20%**. Vous n'avez besoin de modifier que les produits spécifiques qui sont **exonérés** de TVA.

**Q: Comment savoir si un produit est HT ou TTC ?**
R: Regardez la fiche produit. Le sélecteur "Type de Prix" vous indique comment il a été saisi. Dans tous les cas, le système stocke les deux valeurs pour les calculs.

**Q: Puis-je vendre un produit sans TVA à un client spécifique ?**
R: Non, la TVA est liée au **produit**, pas au client (sauf cas très spécifiques d'exportation qui ne sont pas gérés par ce module standard). Si le produit est taxable, tout le monde paie la TVA.

**Q: J'ai fait une erreur de saisie HT/TTC!**
R: Pas de panique. Retournez dans la fiche produit, changez le sélecteur (ex: de HT à TTC) et corrigez le montant. Enregistrez.

---

_Besoin d'aide supplémentaire ? Contactez le support technique._
