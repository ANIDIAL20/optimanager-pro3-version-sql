import { describe, it, expect } from '@jest/globals';
import {
  type PosLineItem,
  setStandardPrice,
  applyPriceOverride,
  applyPercentDiscount,
  recalculateLineTotal,
  getDiscountInfo,
  calculateCartTotal,
  createLineItem,
} from './pricing';

describe('Système de tarification POS', () => {
  // ========================================
  // Tests: createLineItem
  // ========================================
  
  describe('createLineItem', () => {
    it('devrait créer un nouvel élément avec le prix standard', () => {
      const product = { id: '1', name: 'Lunettes', unitPrice: 100 };
      const line = createLineItem(product, 2);

      expect(line.productId).toBe('1');
      expect(line.productName).toBe('Lunettes');
      expect(line.quantity).toBe(2);
      expect(line.originalUnitPrice).toBe(100);
      expect(line.unitPrice).toBe(100);
      expect(line.lineTotal).toBe(200);
      expect(line.priceMode).toBe('STANDARD');
      expect(line.discountAmount).toBe(0);
    });

    it('devrait lancer une erreur si le prix est négatif', () => {
      const product = { id: '1', name: 'Lunettes', unitPrice: -100 };
      expect(() => createLineItem(product, 1)).toThrow();
    });

    it('devrait lancer une erreur si la quantité est 0', () => {
      const product = { id: '1', name: 'Lunettes', unitPrice: 100 };
      expect(() => createLineItem(product, 0)).toThrow();
    });
  });

  // ========================================
  // Tests: setStandardPrice
  // ========================================
  
  describe('setStandardPrice', () => {
    it('devrait réinitialiser l\'élément au prix standard', () => {
      const line: PosLineItem = {
        lineId: '1',
        productId: '1',
        productName: 'Lunettes',
        quantity: 2,
        originalUnitPrice: 100,
        unitPrice: 80,
        lineTotal: 160,
        priceMode: 'DISCOUNT',
        discountPercent: 20,
        discountAmount: 20,
      };

      const result = setStandardPrice(line);

      expect(result.priceMode).toBe('STANDARD');
      expect(result.unitPrice).toBe(100);
      expect(result.lineTotal).toBe(200);
      expect(result.discountPercent).toBeUndefined();
      expect(result.discountAmount).toBe(0);
      expect(result.overrideReason).toBeUndefined();
    });
  });

  // ========================================
  // Tests: applyPercentDiscount
  // ========================================
  
  describe('applyPercentDiscount', () => {
    it('devrait appliquer correctement une remise de 10%', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      const result = applyPercentDiscount(line, 10);

      expect(result.priceMode).toBe('DISCOUNT');
      expect(result.discountPercent).toBe(10);
      expect(result.unitPrice).toBe(90);
      expect(result.discountAmount).toBe(10);
      expect(result.lineTotal).toBe(90);
    });

    it('devrait appliquer une remise de 25% sur plusieurs quantités', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 200 }, 3);
      const result = applyPercentDiscount(line, 25);

      expect(result.unitPrice).toBe(150);
      expect(result.discountAmount).toBe(50);
      expect(result.lineTotal).toBe(450); // 150 × 3
    });

    it('devrait lancer une erreur si le pourcentage dépasse 100', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      expect(() => applyPercentDiscount(line, 150)).toThrow();
    });

    it('devrait lancer une erreur si le pourcentage est négatif', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      expect(() => applyPercentDiscount(line, -10)).toThrow();
    });

    it('devrait accepter une remise de 0%', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      const result = applyPercentDiscount(line, 0);

      expect(result.unitPrice).toBe(100);
      expect(result.discountAmount).toBe(0);
    });
  });

  // ========================================
  // Tests: applyPriceOverride
  // ========================================
  
  describe('applyPriceOverride', () => {
    it('devrait modifier le prix correctement', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2);
      const result = applyPriceOverride(line, 80, 'Client VIP');

      expect(result.priceMode).toBe('OVERRIDE');
      expect(result.unitPrice).toBe(80);
      expect(result.discountAmount).toBe(20);
      expect(result.discountPercent).toBe(20);
      expect(result.lineTotal).toBe(160); // 80 × 2
      expect(result.overrideReason).toBe('Client VIP');
    });

    it('devrait lancer une erreur si le nouveau prix est supérieur à l\'original', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      expect(() => applyPriceOverride(line, 150)).toThrow();
    });

    it('devrait lancer une erreur si le nouveau prix est négatif', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      expect(() => applyPriceOverride(line, -50)).toThrow();
    });

    it('devrait accepter un nouveau prix égal au prix original', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      const result = applyPriceOverride(line, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.discountAmount).toBe(0);
      expect(result.discountPercent).toBe(0);
    });

    it('devrait fonctionner sans motif (motif optionnel)', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      const result = applyPriceOverride(line, 80);

      expect(result.unitPrice).toBe(80);
      expect(result.overrideReason).toBeUndefined();
    });
  });

  // ========================================
  // Tests: recalculateLineTotal
  // ========================================
  
  describe('recalculateLineTotal', () => {
    it('devrait recalculer le total après changement de quantité', () => {
      let line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2);
      expect(line.lineTotal).toBe(200);

      line = { ...line, quantity: 5 };
      line = recalculateLineTotal(line);

      expect(line.lineTotal).toBe(500);
    });

    it('devrait conserver le prix et la remise', () => {
      let line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2);
      line = applyPercentDiscount(line, 20);
      
      expect(line.unitPrice).toBe(80);
      expect(line.lineTotal).toBe(160);

      line = { ...line, quantity: 3 };
      line = recalculateLineTotal(line);

      expect(line.unitPrice).toBe(80); // n'a pas changé
      expect(line.lineTotal).toBe(240); // 80 × 3
    });
  });

  // ========================================
  // Tests: getDiscountInfo
  // ========================================
  
  describe('getDiscountInfo', () => {
    it('devrait retourner hasDiscount = false pour le prix standard', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1);
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(false);
      expect(info.discountPercent).toBe(0);
      expect(info.totalDiscount).toBe(0);
      expect(info.savings).toBe('');
    });

    it('devrait retourner les informations de remise en pourcentage', () => {
      let line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2);
      line = applyPercentDiscount(line, 15);
      
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(true);
      expect(info.discountPercent).toBe(15);
      expect(info.discountAmount).toBe(15);
      expect(info.totalDiscount).toBe(30); // 15 × 2
      expect(info.savings).toContain('15.0%');
      expect(info.savings).toContain('30.00 MAD');
    });

    it('devrait retourner les informations de prix modifié', () => {
      let line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2);
      line = applyPriceOverride(line, 80, 'Offre spéciale');
      
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(true);
      expect(info.totalDiscount).toBe(40); // 20 × 2
      expect(info.savings).toContain('Prix spécial');
      expect(info.savings).toContain('40.00 MAD');
      expect(info.savings).toContain('Offre spéciale');
    });
  });

  // ========================================
  // Tests: calculateCartTotal
  // ========================================
  
  describe('calculateCartTotal', () => {
    it('devrait calculer le total d\'un panier vide', () => {
      const totals = calculateCartTotal([]);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.total).toBe(0);
      expect(totals.itemCount).toBe(0);
    });

    it('devrait calculer le total d\'un panier sans remises', () => {
      const cart = [
        createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2),
        createLineItem({ id: '2', name: 'Lentilles', unitPrice: 50 }, 3),
      ];

      const totals = calculateCartTotal(cart);

      expect(totals.subtotal).toBe(350); // (100×2) + (50×3)
      expect(totals.totalDiscount).toBe(0);
      expect(totals.total).toBe(350);
      expect(totals.itemCount).toBe(5); // 2 + 3
    });

    it('devrait calculer le total d\'un panier avec remises', () => {
      let cart = [
        createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 2),
        createLineItem({ id: '2', name: 'Lentilles', unitPrice: 50 }, 3),
      ];

      cart[0] = applyPercentDiscount(cart[0], 10); // 100 → 90
      cart[1] = applyPriceOverride(cart[1], 40); // 50 → 40

      const totals = calculateCartTotal(cart);

      expect(totals.subtotal).toBe(350); // (100×2) + (50×3)
      expect(totals.total).toBe(300); // (90×2) + (40×3)
      expect(totals.totalDiscount).toBe(50);
      expect(totals.itemCount).toBe(5);
    });
  });

  // ========================================
  // Tests: Edge Cases
  // ========================================
  
  describe('Cas particuliers', () => {
    it('devrait arrondir correctement les décimales', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 99.99 }, 3);
      const result = applyPercentDiscount(line, 33.33);

      // 99.99 × (1 - 0.3333) = 66.66
      expect(result.unitPrice).toBe(66.66);
      expect(result.lineTotal).toBe(199.98); // 66.66 × 3
    });

    it('devrait fonctionner avec des prix très bas', () => {
      const line = createLineItem({ id: '1', name: 'Produit', unitPrice: 0.01 }, 1);
      const result = applyPercentDiscount(line, 50);

      expect(result.unitPrice).toBe(0.01); // arrondi
      expect(result.lineTotal).toBe(0.01);
    });

    it('devrait fonctionner avec de grandes quantités', () => {
      const line = createLineItem({ id: '1', name: 'Lunettes', unitPrice: 100 }, 1000);
      
      expect(line.lineTotal).toBe(100000);
    });
  });
});
