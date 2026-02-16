
import { calculateFromTTC, calculateFromHT, calculatePrices } from '../tva-helpers';

describe('Smart TVA Helpers', () => {
  
  describe('round2', () => {
    // No explicit test needed for round2 if covered by others, but good practice
  });

  describe('calculateFromTTC', () => {
    it('should correctly calculate HT from TTC (20% VAT)', () => {
      const result = calculateFromTTC(1200, true);
      expect(result.ht).toBe(1000);
      expect(result.tva).toBe(200);
      expect(result.ttc).toBe(1200);
    });

    it('should handle non-round numbers correctly (e.g. 100 TTC)', () => {
      const result = calculateFromTTC(100, true);
      // 100 / 1.2 = 83.3333... -> 83.33
      // 100 - 83.33 = 16.67
      expect(result.ht).toBe(83.33);
      expect(result.tva).toBe(16.67);
      expect(result.ttc).toBe(100);
    });

    it('should handle exemption (0% VAT)', () => {
      const result = calculateFromTTC(500, false);
      expect(result.ht).toBe(500);
      expect(result.tva).toBe(0);
      expect(result.ttc).toBe(500);
    });

    it('should throw on negative input', () => {
      expect(() => calculateFromTTC(-10)).toThrow();
    });
  });

  describe('calculateFromHT', () => {
    it('should correctly calculate TTC from HT (20% VAT)', () => {
      const result = calculateFromHT(1000, true);
      expect(result.ht).toBe(1000);
      expect(result.tva).toBe(200);
      expect(result.ttc).toBe(1200);
    });

    it('should handle exemption', () => {
        const result = calculateFromHT(500, false);
        expect(result.ht).toBe(500);
        expect(result.tva).toBe(0);
        expect(result.ttc).toBe(500);
    });
  });

  describe('calculatePrices dispatch', () => {
      it('should route to calculateFromTTC when type is TTC', () => {
          const result = calculatePrices(1200, 'TTC', true);
          expect(result.ht).toBe(1000);
          expect(result.ttc).toBe(1200);
      });

      it('should route to calculateFromHT when type is HT', () => {
          const result = calculatePrices(1000, 'HT', true);
          expect(result.ht).toBe(1000);
          expect(result.ttc).toBe(1200);
      });
  });

});
