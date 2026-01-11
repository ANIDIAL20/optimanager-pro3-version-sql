/**
 * Verification script for complete migration
 */
import { db } from '../src/db';
import { clients, products, sales, devis, supplierOrders, stockMovements, settings, prescriptions } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyAll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  📊 Migration Verification Report                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    try {
        // Count records in each table using Drizzle count
        const clientsResult = await db.select({ count: sql<number>`count(*)` }).from(clients);
        const clientsCount = Number(clientsResult[0].count);
        
        const productsResult = await db.select({ count: sql<number>`count(*)` }).from(products);
        const productsCount = Number(productsResult[0].count);
        
        const salesResult = await db.select({ count: sql<number>`count(*)` }).from(sales);
        const salesCount = Number(salesResult[0].count);
        
        const devisResult = await db.select({ count: sql<number>`count(*)` }).from(devis);
        const devisCount = Number(devisResult[0].count);
        
        const supplierOrdersResult = await db.select({ count: sql<number>`count(*)` }).from(supplierOrders);
        const supplierOrdersCount = Number(supplierOrdersResult[0].count);
        
        const stockMovementsResult = await db.select({ count: sql<number>`count(*)` }).from(stockMovements);
        const stockMovementsCount = Number(stockMovementsResult[0].count);
        
        const settingsResult = await db.select({ count: sql<number>`count(*)` }).from(settings);
        const settingsCount = Number(settingsResult[0].count);
        
        const prescriptionsResult = await db.select({ count: sql<number>`count(*)` }).from(prescriptions);
        const prescriptionsCount = Number(prescriptionsResult[0].count);
        
        console.log('📋 Record Counts:');
        console.log('='.repeat(60));
        console.log(`   1. Clients:          ${clientsCount.toString().padStart(6)}`);
        console.log(`   2. Products:         ${productsCount.toString().padStart(6)}`);
        console.log(`   3. Sales:            ${salesCount.toString().padStart(6)}`);
        console.log(`   4. Devis:            ${devisCount.toString().padStart(6)}`);
        console.log(`   5. Supplier Orders:  ${supplierOrdersCount.toString().padStart(6)}`);
        console.log(`   6. Stock Movements:  ${stockMovementsCount.toString().padStart(6)}`);
        console.log(`   7. Settings:         ${settingsCount.toString().padStart(6)}`);
        console.log(`   8. Prescriptions:    ${prescriptionsCount.toString().padStart(6)}`);
        console.log('='.repeat(60));
        const totalCount = clientsCount + productsCount + salesCount + devisCount + supplierOrdersCount + stockMovementsCount + settingsCount + prescriptionsCount;
        console.log(`   📊 TOTAL:            ${totalCount.toString().padStart(6)}`);
        console.log('='.repeat(60));
        
        // Show sample data
        if (productsCount > 0) {
            console.log('\n📦 Sample Products:');
            const sampleProducts = await db.select().from(products).limit(5);
            sampleProducts.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.nom} - ${p.prixVente} MAD (Stock: ${p.quantiteStock})`);
            });
        }
        
        if (salesCount > 0) {
            console.log('\n💰 Sample Sales:');
            const sampleSales = await db.select().from(sales).limit(5);
            sampleSales.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.clientName || 'Unknown'} - ${s.totalTTC} MAD (${s.status})`);
            });
        }
        
        if (devisCount > 0) {
            console.log('\n📋 Sample Devis:');
            const sampleDevis = await db.select().from(devis).limit(5);
            sampleDevis.forEach((d, i) => {
                console.log(`   ${i + 1}. ${d.clientName} - ${d.totalTTC} MAD (${d.status})`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Verification Complete!');
        console.log('🔍 View all data in Drizzle Studio: npm run db:studio');
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
    
    process.exit(0);
}

verifyAll();
