# Guide de Gestion des Fournisseurs (OptiManager Pro 3)

Ce nouveau système offre des outils avancés pour gérer les commandes et les paiements avec vos fournisseurs, tout en garantissant la précision des données et leur traçabilité.

## 📖 Aperçu

Le système repose sur l'architecture V2 qui permet :

- **Traçabilité des audits** pour chaque opération.
- **Suppression sécurisée (Soft Delete)**.
- **Relevé de compte immédiat** indiquant les débits, crédits et le solde.

## ➕ Comment ajouter une commande (Order)

1. Allez sur la page du fournisseur concerné.
2. Cliquez sur "Commande".
3. Entrez la **Référence** (doit être unique pour ce fournisseur).
4. Précisez la date, le montant et la devise.
5. Cliquez sur "Confirmer la Commande".
   - _Note_ : Le système empêche les doublons de référence pour éviter les erreurs de facturation.

## 💸 Comment enregistrer un paiement (Payment)

1. Sur la page du fournisseur, cliquez sur "Paiement".
2. Entrez le montant versé.
3. Choisissez le mode de paiement (Espèces, Chèque, Virement, etc.).
4. Si vous choisissez **Chèque** ou **Virement**, vous devez saisir le numéro de référence et le nom de la banque.
5. Vous pouvez lier le paiement à une commande spécifique pour faciliter le suivi.
   - _Règle_ : Vous ne pouvez pas enregistrer un paiement supérieur au solde total dû au fournisseur.

## 📄 Comment lire le relevé de compte (Statement)

Le relevé est un tableau chronologique de vos transactions :

- **Type** : ACHAT (commande) ou PAIEMENT (versement).
- **Débit (Achats)** : Augmente le solde du fournisseur (votre dette).
- **Crédit (Paiements)** : Diminue le solde du fournisseur.
- **Solde Courant** : Le montant final restant dû au fournisseur après chaque opération.
  - Rouge : Solde dû par vous.
  - Vert : Compte équilibré (ou solde en votre faveur).

## 🛠️ Dépannage (Troubleshooting)

- **Erreur "Référence existante"** : Vérifiez que vous n'avez pas déjà saisi cette facture, ou ajoutez un suffixe à la référence.
- **Le solde ne se met pas à jour immédiatement** : Le solde est recalculé automatiquement toutes les 30 minutes via la Vue Matérialisée. Actualisez la page pour forcer les derniers résultats.
- **Je ne peux pas supprimer** : La suppression est réservée aux administrateurs (Admins).

---

_L'équipe OptiManager Pro 3_
