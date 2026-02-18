# Analyse Technique : Logique du Relevé de Compte Fournisseur (Historique)

**Projet : OptiManager Pro 3**

Ce document détaille la structure et l'intelligence métier derrière la gestion de l'historique financier des fournisseurs.

---

## 1. Architecture des Données (Base de Données)

La logique du relevé repose sur deux tables principales reliées par le `supplier_id` :

### A. Table `supplier_orders` (Les Achats)

Chaque ligne représente une transaction de type **ACHAT/DÉBIT**.

- **Montant Total (TTC)** : Augmente le solde dû au fournisseur.
- **Référence BC/BL** : Utilisée comme identifiant de transaction dans le relevé.

### B. Table `supplier_payments` (Les Paiements)

Chaque ligne représente une transaction de type **PAIEMENT/CRÉDIT**.

- **Montant** : Diminue le solde dû au fournisseur.
- **Méthode** : Identifie comment le paiement a été effectué (Espèces, Chèque, Virement).

---

## 2. Logique de Calcul du Relevé (Frontend Logic)

Le calcul est effectué en temps réel dans le composant `SupplierView` (`src/app/suppliers/[id]/client-view.tsx`).

### Étape 1 : Fusion des données (Merging)

Le système combine les achats et les paiements dans un seul tableau "historique".

- Les achats reçoivent un attribut `debit = totalAmount` et `credit = 0`.
- Les paiements reçoivent un attribut `debit = 0` et `credit = amount`.

### Étape 2 : Tri Chronologique (Sorting)

Le tableau est trié par **Date croissante** (du plus ancien au plus récent).
_C'est l'étape la plus cruciale pour que le solde progressif soit correct._

### Étape 3 : Calcul du Solde Progressif (Running Balance)

Le système boucle sur le tableau trié et applique la formule comptable standard :

> **Nouveau Solde = Solde Précédent + Débit (Achat) - Crédit (Paiement)**

### Étape 4 : Inversion pour l'affichage

Une fois le calcul terminé, le tableau est inversé (`.reverse()`) pour afficher les transactions les plus récentes en haut du tableau.

---

## 3. Détail du Code source (Extrait)

```tsx
const history = React.useMemo(() => {
  // 1. Fusion
  const combined = [
    ...orders.map((o) => ({
      ...o,
      type: "ACHAT",
      debit: o.totalAmount,
      credit: 0,
    })),
    ...payments.map((p) => ({
      ...p,
      type: "PAIEMENT",
      debit: 0,
      credit: p.amount,
    })),
  ];

  // 2. Tri par date (99.9% important)
  combined.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 3. Calcul du Solde progressif
  let runningBalance = 0;
  return combined
    .map((item) => {
      runningBalance += item.debit - item.credit;
      return { ...item, balance: runningBalance };
    })
    .reverse(); // 4. Affichage inversé
}, [orders, payments]);
```

---

## 4. Indicateurs Clés (KPIs)

Le relevé affiche également un résumé financier global :

1.  **Total Achats** : Somme de tous les montants des commandes.
2.  **Total Payé** : Somme de tous les paiements effectués.
3.  **Solde Actuel (Balance)** : `Total Achats - Total Payé`.
    - _Si positif (> 0)_ : Vous devez de l'argent au fournisseur.
    - _Si négatif (< 0)_ : Vous avez un avoir chez le fournisseur.

---

## 5. Flux Opérationnel (Workflow)

1. **Création Commande** : Enregistrement dans `supplier_orders`. Le solde fournisseur "virtuel" augmente.
2. **Consultation Relevé** : Le système génère dynamiquement la liste chronologique.
3. **Paiement** : Enregistrement dans `supplier_payments`. Le relevé se met à jour instantanément pour montrer la déduction du crédit.

---

_Document généré par Antigravity pour la documentation technique OptiManager Pro._
