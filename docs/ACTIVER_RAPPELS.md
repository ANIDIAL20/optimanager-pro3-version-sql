# 🚀 Instructions pour activer le système de Rappels

## Étape 1: Créer la table sur Neon

1. Va sur **https://console.neon.tech**
2. Sélectionne ton projet OptiManager Pro
3. Clique sur **"SQL Editor"** dans le menu de gauche
4. Copie-colle le contenu de `scripts/create-reminders-table.sql`
5. Clique sur **"Run"**
6. Tu devrais voir: `CREATE TABLE` → Success! ✅

## Étape 2: Vérifier que ça marche

1. Rafraîchis ton app (http://localhost:3000)
2. Clique sur **"Rappels"** 🔔 dans le sidebar
3. Tu devrais voir la page vide avec le bouton "Nouveau Rappel"

## Étape 3: Créer ton premier rappel test

1. Clique sur **"Nouveau Rappel"**
2. Remplis:
   - Titre: "Test Rappel"
   - Date: Demain à 10h00
3. Clique sur **"Créer"**
4. Le rappel devrait apparaître dans "À venir"! 🎉

---

## ✅ Si tout fonctionne:

Tu peux maintenant:

- ✅ Créer des rappels manuels
- ✅ Les marquer comme terminés
- ✅ Les ignorer ou supprimer
- ✅ Créer des rappels récurrents (mensuel, annuel)
- ✅ Auto-créer des rappels pour les chèques fournisseurs

---

## 🔗 Prochaines étapes (optionnel):

### Activer le Cron Job pour notifications quotidiennes

1. Ajoute dans `.env.local`:

   ```env
   CRON_SECRET=ton-secret-super-securise-min-32-chars
   ```

2. Crée `vercel.json`:

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/reminders",
         "schedule": "0 0 * * *"
       }
     ]
   }
   ```

3. Deploy sur Vercel:
   ```bash
   git add .
   git commit -m "feat: Activate reminder cron job"
   git push
   ```

Le cron tournera tous les jours à 00:01 AM! 🚀

---

**Tout est prêt! La table reminders attend juste d'être créée sur Neon.** 🎯
