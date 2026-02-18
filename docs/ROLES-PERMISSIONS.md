# Tableau des Permissions (Gestion Fournisseurs)

Ce document définit les niveaux d'accès pour chaque rôle dans le module fournisseurs.

| Fonctionnalité / Opération          | Admin | Comptable | Manager | Employé |
| :---------------------------------- | :---: | :-------: | :-----: | :-----: |
| Voir les fournisseurs               |  ✅   |    ✅     |   ✅    |   ✅    |
| Ajouter un fournisseur              |  ✅   |    ✅     |   ✅    |   ❌    |
| Ajouter une commande (Order)        |  ✅   |    ✅     |   ✅    |   ❌    |
| Enregistrer un paiement (Payment)   |  ✅   |    ✅     |   ❌    |   ❌    |
| Voir le relevé financier            |  ✅   |    ✅     |   ✅    |   ❌    |
| Modifier les transactions anciennes |  ✅   |    ❌     |   ❌    |   ❌    |
| Supprimer (Soft Delete)             |  ✅   |    ❌     |   ❌    |   ❌    |
| Exporter les données (PDF/Excel)    |  ✅   |    ✅     |   ✅    |   ❌    |
| Voir les journaux d'audit           |  ✅   |    ❌     |   ❌    |   ❌    |

## Détails des rôles :

### 👑 Admin

- Contrôle total sur le système.
- La suppression et la modification financière sont réservées à ce rôle pour garantir la transparence.
- Accès aux rapports de performance globaux.

### 💰 Comptable (Accountant)

- Focus sur les opérations financières quotidiennes.
- Ne peut pas supprimer d'anciens enregistrements, mais peut ajouter de nouvelles commandes ou paiements.

### 🏢 Manager

- Surveille l'état du stock et des commandes.
- Peut ajouter de nouvelles commandes mais n'a pas la permission d'enregistrer les paiements financiers.

### 👤 Employé (Employee)

- Peut uniquement voir la liste des fournisseurs pour faciliter le contact.
- Ne peut pas voir les données financières ou les montants dus pour garantir la confidentialité.

---

_Dernière mise à jour : Février 2026_
