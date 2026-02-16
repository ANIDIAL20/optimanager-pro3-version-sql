
import dotenv from 'dotenv';
import path from 'path';

// Try loading from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { sales, products } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Helper for tax calculation
function calculateTaxBreakdown(price: number, qty: number, isTTC: boolean, hasTva: boolean) {
    const rate = hasTva ? 0.20 : 0.0;
    let unitHT, unitTVA, unitTTC;

    if (isTTC) {
        unitTTC = price;
        unitHT = hasTva ? price / 1.2 : price;
        unitTVA = unitTTC - unitHT;
    } else {
        unitHT = price;
        unitTVA = unitHT * rate;
        unitTTC = unitHT + unitTVA;
    }

    return {
        unitHT: Number(unitHT.toFixed(2)),
        unitTVA: Number(unitTVA.toFixed(2)),
        unitTTC: Number(unitTTC.toFixed(2)),
        totalHT: Number((unitHT * qty).toFixed(2)),
        totalTVA: Number((unitTVA * qty).toFixed(2)),
        totalTTC: Number((unitTTC * qty).toFixed(2)),
        rate: hasTva ? 20 : 0
    };
}

async function migrate() {
    // Dynamic import to ensure process.env is populated before src/db/index loads
    const { db } = await import('../src/db');
    
    console.log('🚀 Starting Sales VAT Migration...');
    
    // Fetch all sales
    const allSales = await db.query.sales.findMany();
    console.log(`📊 Found ${allSales.length} sales to process.`);

    let updatedCount = 0;
    let errorCount = 0;

    // Prefetch products for performance
    const allProducts = await db.query.products.findMany({
        columns: {
            id: true,
            reference: true,
            nom: true,
            categorie: true,
            hasTva: true,
            userId: true
        }
    });
    
    // Create quick lookup map
    const productMap = new Map();
    allProducts.forEach(p => {
        productMap.set(`${p.userId}:${p.id}`, p);
        productMap.set(`${p.userId}:${p.reference}`, p);
    });

    for (const sale of allSales) {
        try {
            const items = sale.items as any[];
            if (!items || !Array.isArray(items) || items.length === 0) continue;

            let needsUpdate = false;
            let runningTotalHT = 0;
            let runningTotalTVA = 0;
            let runningTotalTTC = 0;

            const newItems = items.map(item => {
                // If item is already migrated, keep but recalculate totals
                // But we should re-verify exemption rules just in case
                
                // Identify Product
                const pId = item.productId || item.productRef;
                let product = null;
                if (pId) {
                     product = productMap.get(`${sale.userId}:${pId}`) || 
                               productMap.get(`${sale.userId}:${item.productRef}`);
                }

                // Check exemption
                const isExemptCategory = product?.categorie && 
                    ['Monture', 'Montures', 'Medical'].includes(product.categorie);
                const hasTva = (product?.hasTva !== false) && !isExemptCategory;

                // Price Basis
                const unitPrice = item.unitPrice || item.prixVente || (item.total / item.quantity) || 0;
                
                // Calculate
                const tax = calculateTaxBreakdown(unitPrice, item.quantity, true, hasTva);

                if (!item.tvaRate || !item.priceHT || !item.amountTVA) {
                    needsUpdate = true;
                }

                runningTotalHT += tax.totalHT;
                runningTotalTVA += tax.totalTVA;
                runningTotalTTC += tax.totalTTC;

                return {
                    ...item,
                    unitPrice: tax.unitTTC,
                    priceHT: tax.unitHT,
                    tvaRate: tax.rate,
                    amountTVA: tax.unitTVA,
                    totalHT: tax.totalHT,
                    totalTTC: tax.totalTTC,
                    // Legacy compat
                    prixVente: tax.unitTTC,
                    price: tax.unitTTC,
                    total: tax.totalTTC
                };
            });

            // Update Sale if needed
            const oldTotalTTC = Number(sale.totalTTC);
            const newTotalTTC = Number(runningTotalTTC.toFixed(2));
            
            if (needsUpdate || Math.abs(oldTotalTTC - newTotalTTC) > 0.05 || !sale.totalHT || !sale.totalTVA) {
                await db.update(sales)
                    .set({
                        items: newItems,
                        totalHT: runningTotalHT.toFixed(2),
                        totalTVA: runningTotalTVA.toFixed(2),
                        totalTTC: runningTotalTTC.toFixed(2),
                        totalNet: runningTotalTTC.toFixed(2), 
                        updatedAt: new Date()
                    })
                    .where(eq(sales.id, sale.id));
                
                updatedCount++;
                if (updatedCount % 10 === 0) process.stdout.write('.');
            }

        } catch (err: any) {
            console.error(`❌ Error processing sale ${sale.id}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n✅ Migration Complete.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    process.exit(0);
}

migrate();
