# ❓ Guide de Dépannage (Troubleshooting) - Système TVA

Problèmes courants avec le système Smart TVA et solutions rapides.

---

## 🛑 Problème 1: Le produit ne se crée pas (Page blanche / Erreur Serveur)

**Symptôme:** Vous cliquez sur "Créer" et rien ne se passe, ou un message "Erreur inattendue" s'affiche.

**Cause possible:** Données invalides pour la base de données.

- Prix TTC < HT (impossible)
- TVA négative
- Type de prix invalide

**Solution:**

1. Vérifiez que le **Prix de Vente** n'est pas 0 (sauf produit gratuit)
2. Assurez-vous d'avoir choisi "HT" ou "TTC"
3. Si le produit est exonéré, décochez bien la case "Soumis à TVA"

---

## 🛑 Problème 2: Le Prix TTC change tout seul

**Symptôme:** Vous saisissez "1000" et le système affiche "1000.02" après enregistrement.

**Cause:** Erreur d'arrondi.
Le système convertit HT ↔ TTC. Parfois, la division par 1.20 donne des nombres infinis (ex: 10 / 3 = 3.3333...).

**Solution:**
C'est normal. Le système arrondit au centime le plus proche pour la comptabilité. L'écart est minime.

---

## 🛑 Problème 3: "Erreur de contrainte: chk_sale_price_positive"

**Symptôme:** Message d'erreur technique lors de l'enregistrement.

**Cause:** Vous essayez d'enregistrer un prix négatif.

**Solution:**
Corrigez le prix. Il doit être >= 0.

---

## 🛑 Problème 4: "Erreur de contrainte: chk_tva_coherence"

**Symptôme:** Message d'erreur technique lors de l'enregistrement.

**Cause:** Le calcul HT + TVA ne correspond pas au TTC (écart > 2 centimes).

**Solution:**
C'est un bug rare. Essayez de re-saisir le prix TTC. Si le problème persiste, contactez le support avec le montant exact qui pose problème.

---

## 🛑 Problème 5: Les anciens produits ont TVA = 0 sur les factures

**Symptôme:** Vous imprimez une facture pour un vieux produit et la TVA est vide.

**Cause:** Le produit n'a pas été migré correctement ou est marqué "Non soumis à TVA".

**Solution:**

1. Ouvrez la fiche du produit.
2. Vérifiez que la case "Soumis à TVA" est cochée.
3. Si elle l'est, décochez-la, enregistrez, puis cochez-la à nouveau et enregistrez. Cela forcera le re-calcul des taxes.

---

## 🛑 Problème 6: Lenteur à l'affichage des produits

**Symptôme:** La liste des produits met plus de 2 secondes à charger.

**Cause:** Manque d'index en base de données ou cache non rafraîchi.

**Solution:**
Contactez l'administrateur pour qu'il lance la commande SQL de maintenance: `ANALYZE products;`

---

## 🛑 Problème 7: Impossible de modifier le Type de Prix (HT/TTC)

**Symptôme:** Le bouton HT/TTC semble bloqué.

**Cause:** Certains navigateurs mobiles peuvent avoir du mal avec les petits boutons tactiles.

**Solution:**
Essayez sur un ordinateur ou zoomez sur la page.
