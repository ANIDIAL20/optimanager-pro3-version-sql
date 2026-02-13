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

describe('نظام التسعير في POS', () => {
  // ========================================
  // Tests: createLineItem
  // ========================================
  
  describe('createLineItem', () => {
    it('خاصو يخلق سطر جديد بالثمن العادي', () => {
      const product = { id: '1', name: 'نظارة', unitPrice: 100 };
      const line = createLineItem(product, 2);

      expect(line.productId).toBe('1');
      expect(line.productName).toBe('نظارة');
      expect(line.quantity).toBe(2);
      expect(line.originalUnitPrice).toBe(100);
      expect(line.unitPrice).toBe(100);
      expect(line.lineTotal).toBe(200);
      expect(line.priceMode).toBe('STANDARD');
      expect(line.discountAmount).toBe(0);
    });

    it('خاصو يرمي error إذا كان الثمن سالب', () => {
      const product = { id: '1', name: 'نظارة', unitPrice: -100 };
      expect(() => createLineItem(product, 1)).toThrow();
    });

    it('خاصو يرمي error إذا كانت الكمية 0', () => {
      const product = { id: '1', name: 'نظارة', unitPrice: 100 };
      expect(() => createLineItem(product, 0)).toThrow();
    });
  });

  // ========================================
  // Tests: setStandardPrice
  // ========================================
  
  describe('setStandardPrice', () => {
    it('خاصو يرجع السطر للثمن العادي', () => {
      const line: PosLineItem = {
        lineId: '1',
        productId: '1',
        productName: 'نظارة',
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
    it('خاصو يطبق تخفيض 10% بشكل صحيح', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      const result = applyPercentDiscount(line, 10);

      expect(result.priceMode).toBe('DISCOUNT');
      expect(result.discountPercent).toBe(10);
      expect(result.unitPrice).toBe(90);
      expect(result.discountAmount).toBe(10);
      expect(result.lineTotal).toBe(90);
    });

    it('خاصو يطبق تخفيض 25% على كمية متعددة', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 200 }, 3);
      const result = applyPercentDiscount(line, 25);

      expect(result.unitPrice).toBe(150);
      expect(result.discountAmount).toBe(50);
      expect(result.lineTotal).toBe(450); // 150 × 3
    });

    it('خاصو يرمي error إذا كانت النسبة أكبر من 100', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      expect(() => applyPercentDiscount(line, 150)).toThrow();
    });

    it('خاصو يرمي error إذا كانت النسبة سالبة', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      expect(() => applyPercentDiscount(line, -10)).toThrow();
    });

    it('خاصو يقبل تخفيض 0%', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      const result = applyPercentDiscount(line, 0);

      expect(result.unitPrice).toBe(100);
      expect(result.discountAmount).toBe(0);
    });
  });

  // ========================================
  // Tests: applyPriceOverride
  // ========================================
  
  describe('applyPriceOverride', () => {
    it('خاصو يبدل الثمن بشكل صحيح', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2);
      const result = applyPriceOverride(line, 80, 'عميل VIP');

      expect(result.priceMode).toBe('OVERRIDE');
      expect(result.unitPrice).toBe(80);
      expect(result.discountAmount).toBe(20);
      expect(result.discountPercent).toBe(20);
      expect(result.lineTotal).toBe(160); // 80 × 2
      expect(result.overrideReason).toBe('عميل VIP');
    });

    it('خاصو يرمي error إذا كان الثمن الجديد أكبر من الأصلي', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      expect(() => applyPriceOverride(line, 150)).toThrow();
    });

    it('خاصو يرمي error إذا كان الثمن الجديد سالب', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      expect(() => applyPriceOverride(line, -50)).toThrow();
    });

    it('خاصو يقبل ثمن جديد يساوي الثمن الأصلي', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      const result = applyPriceOverride(line, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.discountAmount).toBe(0);
      expect(result.discountPercent).toBe(0);
    });

    it('خاصو يخدم بدون سبب (reason اختياري)', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      const result = applyPriceOverride(line, 80);

      expect(result.unitPrice).toBe(80);
      expect(result.overrideReason).toBeUndefined();
    });
  });

  // ========================================
  // Tests: recalculateLineTotal
  // ========================================
  
  describe('recalculateLineTotal', () => {
    it('خاصو يعاود يحسب المجموع بعد تغيير الكمية', () => {
      let line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2);
      expect(line.lineTotal).toBe(200);

      line = { ...line, quantity: 5 };
      line = recalculateLineTotal(line);

      expect(line.lineTotal).toBe(500);
    });

    it('خاصو يحافظ على الثمن والتخفيض', () => {
      let line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2);
      line = applyPercentDiscount(line, 20);
      
      expect(line.unitPrice).toBe(80);
      expect(line.lineTotal).toBe(160);

      line = { ...line, quantity: 3 };
      line = recalculateLineTotal(line);

      expect(line.unitPrice).toBe(80); // ما تبدلش
      expect(line.lineTotal).toBe(240); // 80 × 3
    });
  });

  // ========================================
  // Tests: getDiscountInfo
  // ========================================
  
  describe('getDiscountInfo', () => {
    it('خاصو يرجع hasDiscount = false للثمن العادي', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1);
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(false);
      expect(info.discountPercent).toBe(0);
      expect(info.totalDiscount).toBe(0);
      expect(info.savings).toBe('');
    });

    it('خاصو يرجع معلومات التخفيض بالنسبة المئوية', () => {
      let line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2);
      line = applyPercentDiscount(line, 15);
      
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(true);
      expect(info.discountPercent).toBe(15);
      expect(info.discountAmount).toBe(15);
      expect(info.totalDiscount).toBe(30); // 15 × 2
      expect(info.savings).toContain('15.0%');
      expect(info.savings).toContain('30.00 MAD');
    });

    it('خاصو يرجع معلومات الثمن المتبدل', () => {
      let line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2);
      line = applyPriceOverride(line, 80, 'عرض خاص');
      
      const info = getDiscountInfo(line);

      expect(info.hasDiscount).toBe(true);
      expect(info.totalDiscount).toBe(40); // 20 × 2
      expect(info.savings).toContain('ثمن خاص');
      expect(info.savings).toContain('40.00 MAD');
      expect(info.savings).toContain('عرض خاص');
    });
  });

  // ========================================
  // Tests: calculateCartTotal
  // ========================================
  
  describe('calculateCartTotal', () => {
    it('خاصو يحسب مجموع سلة فارغة', () => {
      const totals = calculateCartTotal([]);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.total).toBe(0);
      expect(totals.itemCount).toBe(0);
    });

    it('خاصو يحسب مجموع سلة بدون تخفيضات', () => {
      const cart = [
        createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2),
        createLineItem({ id: '2', name: 'عدسات', unitPrice: 50 }, 3),
      ];

      const totals = calculateCartTotal(cart);

      expect(totals.subtotal).toBe(350); // (100×2) + (50×3)
      expect(totals.totalDiscount).toBe(0);
      expect(totals.total).toBe(350);
      expect(totals.itemCount).toBe(5); // 2 + 3
    });

    it('خاصو يحسب مجموع سلة مع تخفيضات', () => {
      let cart = [
        createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 2),
        createLineItem({ id: '2', name: 'عدسات', unitPrice: 50 }, 3),
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
  
  describe('حالات خاصة', () => {
    it('خاصو يدور الأرقام العشرية بشكل صحيح', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 99.99 }, 3);
      const result = applyPercentDiscount(line, 33.33);

      // 99.99 × (1 - 0.3333) = 66.66
      expect(result.unitPrice).toBe(66.66);
      expect(result.lineTotal).toBe(199.98); // 66.66 × 3
    });

    it('خاصو يخدم مع أثمنة صغيرة جدًا', () => {
      const line = createLineItem({ id: '1', name: 'منتوج', unitPrice: 0.01 }, 1);
      const result = applyPercentDiscount(line, 50);

      expect(result.unitPrice).toBe(0.01); // مدور
      expect(result.lineTotal).toBe(0.01);
    });

    it('خاصو يخدم مع كميات كبيرة', () => {
      const line = createLineItem({ id: '1', name: 'نظارة', unitPrice: 100 }, 1000);
      
      expect(line.lineTotal).toBe(100000);
    });
  });
});
