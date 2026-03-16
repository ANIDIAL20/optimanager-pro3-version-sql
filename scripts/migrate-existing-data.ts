import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';


async function main() {
    console.log('🚀 Starting Data Migration to V2 Architecture...');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Mapping for IDs: Old UUID -> New Serial ID
    const supplierIdMap = new Map<string, number>();

    try {
        await db.transaction(async (tx) => {
            console.log('📦 Phase 1: Migrating Suppliers...');
            const oldSuppliers = await tx.execute(sql`SELECT * FROM "suppliers"`);
            const supplierRows = (oldSuppliers.rows || []) as any[];
            
            for (const s of supplierRows) {
                const result = await tx.execute(sql`
                    INSERT INTO "suppliers_v2" (name, phone, email, address, tax_id, created_by, created_at, is_active, notes)
                    VALUES (${s.name}, ${s.phone}, ${s.email}, ${s.address}, ${s.ice || s.if || null}, 'system', ${s.created_at || new Date().toISOString()}, true, ${s.category || null})
                    RETURNING id
                `);
                const newId = (result.rows[0] as any).id;
                supplierIdMap.set(s.id, newId);
                console.log(`  ✅ Migrated supplier: ${s.name} (${s.id} -> ${newId})`);
            }

            console.log('📦 Phase 2: Migrating Orders...');
            const oldOrders = await tx.execute(sql`SELECT * FROM "supplier_orders"`);
            const orderRows = (oldOrders.rows || []) as any[];
            
            for (const o of orderRows) {
                const newSupplierId = o.supplier_id ? supplierIdMap.get(o.supplier_id) : null;
                
                if (!newSupplierId && o.supplier_id) {
                    console.warn(`  ⚠️ Supplier ID ${o.supplier_id} not found for order #${o.id}. Skipping or mapping as orphan.`);
                    continue;
                }

                // Map status
                let status = 'pending';
                if (o.statut === 'REÇU') status = 'received';
                if (o.statut === 'ANNULÉ') status = 'cancelled';

                await tx.execute(sql`
                    INSERT INTO "supplier_orders_v2" (supplier_id, reference, order_date, total_amount, currency, status, created_by, created_at)
                    VALUES (${newSupplierId}, ${o.order_reference || o.order_number || `LEGACY-${o.id}`}, ${o.date_commande || o.created_at}, ${o.montant_total}, 'MAD', ${status}, 'system', ${o.created_at})
                `);
                console.log(`  ✅ Migrated order #${o.id}`);
            }

            console.log('📦 Phase 3: Migrating Payments...');
            try {
                const oldPayments = await tx.execute(sql`SELECT * FROM "supplier_payments"`);
                const payRows = (oldPayments.rows || []) as any[];
                
                for (const p of payRows) {
                    const newSupplierId = p.supplier_id ? supplierIdMap.get(p.supplier_id) : null;
                    if (!newSupplierId) continue;

                    await tx.execute(sql`
                        INSERT INTO "supplier_payments_v2" (supplier_id, amount, payment_date, method, reference, created_by, created_at)
                        VALUES (${newSupplierId}, ${p.amount}, ${p.date || p.created_at}, ${p.method || 'Espèces'}, ${p.reference || null}, 'system', ${p.created_at || new Date().toISOString()})
                    `);
                    console.log(`  ✅ Migrated payment #${p.id}`);
                }
            } catch (e) {
                console.log('  ℹ️ No legacy payments found to migrate.');
            }

            console.log('\n✨ Migration Phase Completed Successfully!');
        });
    } catch (err) {
        console.error('❌ Migration failed and rolled back:', err);
    } finally {
        await pool.end();
    }
}

main();
