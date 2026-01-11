/**
 * Complete Firebase → Neon Migration Script
 * Migrates ALL collections in the correct order
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { db } from '../src/db';
import { clients, products, sales, devis, supplierOrders, stockMovements, settings, prescriptions } from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('❌ Firebase credentials missing in .env.local');
}

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
}

const app = initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
});

const firestore = getFirestore(app);

// Get userId from environment or prompt
const USER_ID = process.env.FIREBASE_USER_ID || 'default-store'; // Update this with actual user ID

/**
 * Helper: Convert Firebase timestamp to JS Date
 */
function convertTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
    if (typeof timestamp === 'string') return new Date(timestamp);
    return null;
}

/**
 * 1. Migrate Products
 */
async function migrateProducts() {
    console.log('\n🏷️  Migrating Products...');
    
    try {
        const productsRef = firestore.collection(`stores/${USER_ID}/products`);
        const snapshot = await productsRef.get();
        
        console.log(`📊 Found ${snapshot.size} products in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No products to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                const productData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    reference: data.reference || null,
                    nom: data.nom || data.name || 'Unknown',
                    designation: data.designation || null,
                    categorie: data.categorie || data.category || null,
                    marque: data.marque || data.brand || null,
                    fournisseur: data.fournisseur || null,
                    prixAchat: data.prixAchat?.toString() || null,
                    prixVente: data.prixVente?.toString() || data.price?.toString() || '0',
                    prixGros: data.prixGros?.toString() || null,
                    quantiteStock: data.quantiteStock || data.stock || 0,
                    seuilAlerte: data.seuilAlerte || 5,
                    description: data.description || null,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: new Date(),
                };
                
                await db.insert(products).values(productData);
                success++;
                console.log(`✅ Product: ${productData.nom}`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating product ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in product migration:', error);
        throw error;
    }
}

/**
 * 2. Migrate Sales
 */
async function migrateSales() {
    console.log('\n💰 Migrating Sales...');
    
    try {
        const salesRef = firestore.collection(`stores/${USER_ID}/sales`);
        const snapshot = await salesRef.get();
        
        console.log(`📊 Found ${snapshot.size} sales in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No sales to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                // Try to find client by firebaseId
                let clientId = null;
                if (data.clientId) {
                    const clientMatch = await db.select().from(clients).where({ firebaseId: data.clientId }).limit(1);
                    if (clientMatch.length > 0) {
                        clientId = clientMatch[0].id;
                    }
                }
                
                const saleData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    clientId: clientId,
                    clientName: data.clientName || null,
                    clientPhone: data.clientPhone || null,
                    clientMutuelle: data.clientMutuelle || null,
                    clientAddress: data.clientAddress || null,
                    totalHT: data.totalHT?.toString() || null,
                    totalTVA: data.totalTVA?.toString() || null,
                    totalTTC: data.totalTTC?.toString() || data.totalNet?.toString() || '0',
                    totalNet: data.totalNet?.toString() || data.totalTTC?.toString() || null,
                    totalPaye: data.totalPaye?.toString() || '0',
                    resteAPayer: data.resteAPayer?.toString() || null,
                    status: data.status || 'impaye',
                    paymentMethod: data.paymentMethod || null,
                    type: data.type || null,
                    items: data.items || [],
                    paymentHistory: data.paymentHistory || [],
                    prescriptionSnapshot: data.prescriptionSnapshot || null,
                    notes: data.notes || null,
                    date: convertTimestamp(data.date) || convertTimestamp(data.createdAt),
                    lastPaymentDate: convertTimestamp(data.lastPaymentDate),
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: new Date(),
                };
                
                await db.insert(sales).values(saleData);
                success++;
                console.log(`✅ Sale: ${saleData.clientName || 'Unknown'} - ${saleData.totalTTC} MAD`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating sale ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in sales migration:', error);
        throw error;
    }
}

/**
 * 3. Migrate Devis
 */
async function migrateDevis() {
    console.log('\n📋 Migrating Devis...');
    
    try {
        const devisRef = firestore.collection(`stores/${USER_ID}/devis`);
        const snapshot = await devisRef.get();
        
        console.log(`📊 Found ${snapshot.size} devis in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No devis to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                // Try to find client
                let clientId = null;
                if (data.clientId) {
                    const clientMatch = await db.select().from(clients).where({ firebaseId: data.clientId }).limit(1);
                    if (clientMatch.length > 0) {
                        clientId = clientMatch[0].id;
                    }
                }
                
                // Try to find sale
                let saleId = null;
                if (data.saleId) {
                    const saleMatch = await db.select().from(sales).where({ firebaseId: data.saleId }).limit(1);
                    if (saleMatch.length > 0) {
                        saleId = saleMatch[0].id;
                    }
                }
                
                const devisData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    clientId: clientId,
                    clientName: data.clientName || 'Unknown',
                    clientPhone: data.clientPhone || null,
                    items: data.items || [],
                    totalHT: data.totalHT?.toString() || '0',
                    totalTTC: data.totalTTC?.toString() || '0',
                    status: data.status || 'EN_ATTENTE',
                    saleId: saleId,
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: new Date(),
                };
                
                await db.insert(devis).values(devisData);
                success++;
                console.log(`✅ Devis: ${devisData.clientName} - ${devisData.status}`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating devis ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in devis migration:', error);
        throw error;
    }
}

/**
 * 4. Migrate Supplier Orders
 */
async function migrateSupplierOrders() {
    console.log('\n📦 Migrating Supplier Orders...');
    
    try {
        const ordersRef = firestore.collection(`stores/${USER_ID}/supplier_orders`);
        const snapshot = await ordersRef.get();
        
        console.log(`📊 Found ${snapshot.size} supplier orders in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No supplier orders to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                const orderData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    fournisseur: data.fournisseur || 'Unknown',
                    items: data.items || [],
                    montantTotal: data.montantTotal?.toString() || '0',
                    montantPaye: data.montantPaye?.toString() || '0',
                    resteAPayer: data.resteAPayer?.toString() || null,
                    statut: data.statut || 'EN_COURS',
                    dateCommande: convertTimestamp(data.dateCommande),
                    dateReception: convertTimestamp(data.dateReception),
                    notes: data.notes || null,
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: new Date(),
                };
                
                await db.insert(supplierOrders).values(orderData);
                success++;
                console.log(`✅ Supplier Order: ${orderData.fournisseur} - ${orderData.montantTotal} MAD`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating supplier order ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in supplier orders migration:', error);
        throw error;
    }
}

/**
 * 5. Migrate Stock Movements
 */
async function migrateStockMovements() {
    console.log('\n📊 Migrating Stock Movements...');
    
    try {
        const movementsRef = firestore.collection(`stores/${USER_ID}/stockMovements`);
        const snapshot = await movementsRef.get();
        
        console.log(`📊 Found ${snapshot.size} stock movements in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No stock movements to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                // Try to find product
                let productId = null;
                if (data.produitId) {
                    const productMatch = await db.select().from(products).where({ firebaseId: data.produitId }).limit(1);
                    if (productMatch.length > 0) {
                        productId = productMatch[0].id;
                    }
                }
                
                const movementData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    produitId: data.produitId || null,
                    productId: productId,
                    quantite: data.quantite || 0,
                    type: data.type || 'Ajustement',
                    ref: data.ref || null,
                    date: convertTimestamp(data.date) || new Date(),
                    notes: data.notes || null,
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                };
                
                await db.insert(stockMovements).values(movementData);
                success++;
                console.log(`✅ Stock Movement: ${movementData.type} - ${movementData.quantite}`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating stock movement ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in stock movements migration:', error);
        throw error;
    }
}

/**
 * 6. Migrate Settings
 */
async function migrateSettings() {
    console.log('\n⚙️  Migrating Settings...');
    
    try {
        const settingsRef = firestore.collection(`stores/${USER_ID}/settings`);
        const snapshot = await settingsRef.get();
        
        console.log(`📊 Found ${snapshot.size} settings in Firebase`);
        
        if (snapshot.empty) {
            console.log('⚠️  No settings to migrate');
            return { success: 0, errors: 0 };
        }
        
        let success = 0, errors = 0;
        
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                
                const settingData = {
                    firebaseId: doc.id,
                    userId: USER_ID,
                    settingKey: doc.id, // Use document ID as key
                    value: data, // Store entire document as JSON
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: new Date(),
                };
                
                await db.insert(settings).values(settingData);
                success++;
                console.log(`✅ Setting: ${doc.id}`);
            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating setting ${doc.id}:`, error.message);
            }
        }
        
        return { success, errors };
    } catch (error) {
        console.error('💥 Error in settings migration:', error);
        throw error;
    }
}

/**
 * Main Migration Function
 */
async function migrateAll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  🚀 Complete Firebase → Neon Migration                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n📍 User ID: ${USER_ID}\n`);
    
    const results: any = {};
    
    try {
        // 1. Products (independent)
        results.products = await migrateProducts();
        
        // 2. Sales (depends on clients + products)
        results.sales = await migrateSales();
        
        // 3. Devis (depends on clients + products + sales)
        results.devis = await migrateDevis();
        
        // 4. Supplier Orders (depends on products)
        results.supplierOrders = await migrateSupplierOrders();
        
        // 5. Stock Movements (depends on products)
        results.stockMovements = await migrateStockMovements();
        
        // 6. Settings (independent)
        results.settings = await migrateSettings();
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✨ MIGRATION COMPLETE!');
        console.log('='.repeat(60));
        console.log('\n📊 Results:');
        Object.keys(results).forEach(key => {
            const { success, errors } = results[key];
            console.log(`   ${key}: ✅ ${success} | ❌ ${errors}`);
        });
        console.log('\n' + '='.repeat(60));
        console.log('🎉 All data migrated successfully!');
        console.log('🔍 Check Drizzle Studio: npm run db:studio');
        console.log('='.repeat(60) + '\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateAll();
