import { describe, expect, it } from 'vitest';

import {
  applyDiscount,
  applyPercentDiscount,
  applyPriceOverride,
  calculateCartTotal,
  calculateHT,
  calculateMargin,
  calculateTTC,
  calculateTVA,
  createLineItem,
  recalculateLineTotal,
  setStandardPrice,
  validateLineTotal,
  type PosLineItem,
} from './pricing';

describe('TVA Calculations', () => {
  it('calculateTTC should compute TTC from HT with rate 0.20', () => {
    expect(calculateTTC(100, 0.2)).toBeCloseTo(120);
  });

  it('calculateTTC should compute TTC from HT with rate 0.07', () => {
    expect(calculateTTC(100, 0.07)).toBeCloseTo(107);
  });

  it('calculateTTC should return same when tvaRate = 0', () => {
    expect(calculateTTC(100, 0)).toBeCloseTo(100);
  });

  it('calculateHT should compute HT from TTC with rate 0.20', () => {
    expect(calculateHT(120, 0.2)).toBeCloseTo(100);
  });

  it('calculateHT should compute HT from TTC with rate 0.07', () => {
    expect(calculateHT(107, 0.07)).toBeCloseTo(100);
  });

  it('calculateHT should return TTC when tvaRate = 0', () => {
    expect(calculateHT(100, 0)).toBeCloseTo(100);
  });

  it('calculateTVA should compute TVA amount from TTC and rate 0.20', () => {
    expect(calculateTVA(120, 0.2)).toBeCloseTo(20);
  });

  it('calculateTVA should compute TVA amount from TTC and rate 0.07', () => {
    const tva = calculateTVA(107, 0.07);
    expect(tva).toBeCloseTo(7);
  });

  it('should throw on negative tvaRate', () => {
    expect(() => calculateTTC(100, -0.2)).toThrow();
    expect(() => calculateHT(100, -0.2)).toThrow();
  });

  it('should throw on negative price', () => {
    expect(() => calculateTTC(-1, 0.2)).toThrow();
    expect(() => calculateHT(-1, 0.2)).toThrow();
  });

  it('should throw on NaN inputs', () => {
    expect(() => calculateTTC(Number.NaN, 0.2)).toThrow();
    expect(() => calculateHT(100, Number.NaN)).toThrow();
  });
});

describe('Discount Logic', () => {
  it('applyDiscount percent 10% should reduce price', () => {
    expect(applyDiscount(200, { type: 'PERCENT', value: 10 })).toBeCloseTo(180);
  });

  it('applyDiscount amount 50 should reduce price', () => {
    expect(applyDiscount(200, { type: 'AMOUNT', value: 50 })).toBeCloseTo(150);
  });

  it('applyDiscount percent 0 should keep price unchanged', () => {
    expect(applyDiscount(200, { type: 'PERCENT', value: 0 })).toBeCloseTo(200);
  });

  it('applyDiscount amount 0 should keep price unchanged', () => {
    expect(applyDiscount(200, { type: 'AMOUNT', value: 0 })).toBeCloseTo(200);
  });

  it('applyDiscount percent > 100 should throw', () => {
    expect(() => applyDiscount(200, { type: 'PERCENT', value: 150 })).toThrow();
  });

  it('applyDiscount negative amount should throw', () => {
    expect(() => applyDiscount(200, { type: 'AMOUNT', value: -1 })).toThrow();
  });

  it('applyDiscount amount > price clamps to 0', () => {
    expect(applyDiscount(50, { type: 'AMOUNT', value: 999 })).toBe(0);
  });

  it('applyPercentDiscount should set priceMode DISCOUNT and recalc totals', () => {
    const item = createLineItem('p1', 'Test', 100, 2, 'AUTRE');
    const discounted = applyPercentDiscount(item, 10);
    expect(discounted.priceMode).toBe('DISCOUNT');
    expect(discounted.unitPrice).toBeCloseTo(90);
    expect(discounted.lineTotal).toBeCloseTo(180);
  });

  it('applyPriceOverride should set priceMode OVERRIDE and recalc totals', () => {
    const item = createLineItem('p1', 'Test', 100, 2, 'AUTRE');
    const overridden = applyPriceOverride(item, 80, 'Promo');
    expect(overridden.priceMode).toBe('OVERRIDE');
    expect(overridden.unitPrice).toBe(80);
    expect(overridden.lineTotal).toBe(160);
    expect(overridden.overrideReason).toBe('Promo');
  });

  it('setStandardPrice should reset to original', () => {
    const item = createLineItem('p1', 'Test', 100, 2, 'AUTRE');
    const overridden = applyPriceOverride(item, 80, 'Promo');
    const reset = setStandardPrice(overridden);
    expect(reset.priceMode).toBe('STANDARD');
    expect(reset.unitPrice).toBe(100);
    expect(reset.lineTotal).toBe(200);
  });
});

describe('Cart Totals', () => {
  it('calculateCartTotal should return 0 for empty cart', () => {
    expect(calculateCartTotal([])).toBe(0);
  });

  it('calculateCartTotal should sum line totals', () => {
    const a = createLineItem('a', 'A', 10, 2, 'AUTRE');
    const b = createLineItem('b', 'B', 5, 4, 'AUTRE');
    expect(calculateCartTotal([a, b])).toBeCloseTo(10 * 2 + 5 * 4);
  });

  it('calculateCartTotal should work with mix simple + pack verres', () => {
    const simple = createLineItem('a', 'A', 100, 1, 'MONTURE');
    const pack = createLineItem('LENS-PACK-PRODUCT', 'Pack', 250, 1, 'VERRE', {
      isComplexPack: true,
      prescription: { od: {}, og: {}, pd: {} },
      lensOrder: { supplierId: '1', supplierName: 'X', orderType: 'unifocal', purchasePrice: 0, eye: 'les deux' },
    });
    expect(calculateCartTotal([simple, pack])).toBeCloseTo(350);
  });

  it('calculateCartTotal should reflect partial discounts', () => {
    const a = createLineItem('a', 'A', 100, 2, 'AUTRE');
    const discounted = applyPercentDiscount(a, 25); // 75 * 2
    const b = createLineItem('b', 'B', 50, 1, 'AUTRE');
    expect(calculateCartTotal([discounted, b])).toBeCloseTo(75 * 2 + 50);
  });

  it('recalculateLineTotal should recompute from unitPrice × quantity', () => {
    const item = createLineItem('a', 'A', 100, 1, 'AUTRE');
    const updated: PosLineItem = { ...item, quantity: 3 };
    const recalced = recalculateLineTotal(updated);
    expect(recalced.lineTotal).toBe(300);
  });
});

describe('lineTotal Consistency', () => {
  it('validateLineTotal should return true when exact', () => {
    const item = createLineItem('a', 'A', 10, 2, 'AUTRE');
    expect(validateLineTotal(item)).toBe(true);
  });

  it('validateLineTotal should return true within tolerance', () => {
    const item = createLineItem('a', 'A', 10, 2, 'AUTRE');
    const noisy = { ...item, lineTotal: item.unitPrice * item.quantity + 0.005 };
    expect(validateLineTotal(noisy)).toBe(true);
  });

  it('validateLineTotal should return false outside tolerance', () => {
    const item = createLineItem('a', 'A', 10, 2, 'AUTRE');
    const wrong = { ...item, lineTotal: item.unitPrice * item.quantity + 0.02 };
    expect(validateLineTotal(wrong)).toBe(false);
  });
});

describe('Margin Calculations', () => {
  it('calculateMargin should compute positive margin and percent', () => {
    const { margin, marginPercent } = calculateMargin(200, 150);
    expect(margin).toBe(50);
    expect(marginPercent).toBeCloseTo(25);
  });

  it('calculateMargin should allow negative margin', () => {
    const { margin, marginPercent } = calculateMargin(100, 150);
    expect(margin).toBe(-50);
    expect(marginPercent).toBeCloseTo(-50);
  });

  it('calculateMargin should return marginPercent 0 when sellingPrice <= 0', () => {
    const { margin, marginPercent } = calculateMargin(0, 10);
    expect(margin).toBe(-10);
    expect(marginPercent).toBe(0);
  });
});

describe('Edge Cases', () => {
  it('applyPriceOverride should throw when newUnitPrice <= 0', () => {
    const item = createLineItem('a', 'A', 10, 1, 'AUTRE');
    expect(() => applyPriceOverride(item, 0)).toThrow();
  });

  it('applyPercentDiscount should throw when percent < 0', () => {
    const item = createLineItem('a', 'A', 10, 1, 'AUTRE');
    expect(() => applyPercentDiscount(item, -1)).toThrow();
  });

  it('applyPercentDiscount should throw when percent > 100', () => {
    const item = createLineItem('a', 'A', 10, 1, 'AUTRE');
    expect(() => applyPercentDiscount(item, 101)).toThrow();
  });

  it('applyDiscount should throw when price is NaN', () => {
    expect(() => applyDiscount(Number.NaN, { type: 'AMOUNT', value: 1 })).toThrow();
  });

  it('calculateCartTotal should handle quantity 0 (even if not expected)', () => {
    const item = createLineItem('a', 'A', 10, 1, 'AUTRE');
    const zeroQty: PosLineItem = { ...item, quantity: 0, lineTotal: 0 };
    expect(calculateCartTotal([zeroQty])).toBe(0);
  });
});
