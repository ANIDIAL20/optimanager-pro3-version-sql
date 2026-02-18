// tests/supplier-calculations.test.ts
// Unit tests for supplier business logic

import { validatePaymentAmount, validateOrderData } from '../src/lib/utils/supplier-utils';

describe('Supplier Calculations & Validations', () => {
    
    test('validatePaymentAmount - fails for negative amount', async () => {
        const result = await validatePaymentAmount(1, -100);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('صفر');
    });

    test('validateOrderData - fails for future date', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const result = await validateOrderData({
            supplierId: 1,
            reference: 'REF-001',
            orderDate: futureDate,
            totalAmount: 1000
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('التاريخ لا يمكن أن يكون في المستقبل البعيد');
    });

    test('validateOrderData - fails for zero amount', async () => {
        const result = await validateOrderData({
            supplierId: 1,
            reference: 'REF-002',
            orderDate: new Date(),
            totalAmount: 0
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('يجب أن يكون المبلغ أكبر من صفر');
    });
});
