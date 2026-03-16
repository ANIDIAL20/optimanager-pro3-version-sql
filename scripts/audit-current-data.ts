import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';


// Import existing schema names from core schema file
import { suppliers, supplierOrders } from '../src/db/schema';

async function main() {
    console.log('🔍 Starting Data Audit...');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    const report = {
        timestamp: new Date().toISOString(),
        suppliers: { total: 0, anomalies: [] as any[] },
        orders: { total: 0, anomalies: [] as any[] },
        payments: { total: 0, anomalies: [] as any[] }
    };

    try {
        // 1. Audit Suppliers
        const allSuppliers = await db.execute(sql`SELECT * FROM "suppliers"`);
        const supplierRows = allSuppliers.rows || [];
        report.suppliers.total = supplierRows.length;
        
        // 2. Audit Orders
        const allOrders = await db.execute(sql`SELECT * FROM "supplier_orders"`);
        const orderRows = (allOrders.rows || []) as any[];
        report.orders.total = orderRows.length;

        for (const order of orderRows) {
            const amount = Number(order.montant_total || 0);
            const date = new Date(order.date_commande || order.created_at);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (amount <= 0) {
                report.orders.anomalies.push({ id: order.id, type: 'NEGATIVE_AMOUNT', value: amount });
            }
            if (date > tomorrow) {
                report.orders.anomalies.push({ id: order.id, type: 'FUTURE_DATE', value: date.toISOString() });
            }
            if (!['EN_COURS', 'REÇU', 'ANNULÉ'].includes(order.statut)) {
                // report.orders.anomalies.push({ id: order.id, type: 'INVALID_STATUS', value: order.statut });
            }
        }

        // 3. Audit Payments (if table exists)
        try {
            const allPayments = await db.execute(sql`SELECT * FROM "supplier_payments"`);
            const paymentRows = (allPayments.rows || []) as any[];
            report.payments.total = paymentRows.length;
            
            for (const pay of paymentRows) {
                const amount = Number(pay.amount || 0);
                if (amount <= 0) {
                    report.payments.anomalies.push({ id: pay.id, type: 'NEGATIVE_AMOUNT', value: amount });
                }
            }
        } catch (e) {
            console.log('⚠️ No supplier_payments table found yet or error reading it.');
        }

        // Output Report
        fs.writeFileSync('data-audit-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n📊 Audit Report Summary:');
        console.log(`- Suppliers: ${report.suppliers.total}`);
        console.log(`- Orders: ${report.orders.total} (${report.orders.anomalies.length} anomalies detection)`);
        console.log(`- Payments: ${report.payments.total} (${report.payments.anomalies.length} anomalies detection)`);
        console.log('\n✅ Results saved in data-audit-report.json');

    } catch (err) {
        console.error('❌ Audit failed:', err);
    } finally {
        await pool.end();
    }
}

main();
