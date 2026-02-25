'use server';

import { db } from '@/db';
import { 
  clients, 
  products, 
  sales, 
  devis, 
  supplierOrders, 
  prescriptions, 
  contactLensPrescriptions,
  lensOrders,
  suppliers,
  shopProfiles,
  settings,
  stockMovements,
  reminders,
  brands,
  categories,
  materials,
  colors,
  treatments,
  mountingTypes,
  banks,
  insurances
} from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql } from 'drizzle-orm';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { revalidatePath } from 'next/cache';
import type { DrizzleTx } from '@/types/db';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Export all user data as GZIP compressed JSON
 * Returns a base64 encoded string of the compressed data
 */
export async function exportUserData() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const userId = session.user.id;

  try {
    // Fetch all data for this user in parallel
    const [
      clientsData,
      productsData,
      salesData,
      devisData,
      supplierOrdersData,
      prescriptionsData,
      contactLensPrescriptionsData,
      lensOrdersData,
      suppliersData,
      shopProfilesData,
      settingsData,
      stockMovementsData,
      remindersData,
      brandsData,
      categoriesData,
      materialsData,
      colorsData,
      treatmentsData,
      mountingTypesData,
      banksData,
      insurancesData
    ] = await Promise.all([
      db.select().from(clients).where(eq(clients.userId, userId)),
      db.select().from(products).where(eq(products.userId, userId)),
      db.select().from(sales).where(eq(sales.userId, userId)),
      db.select().from(devis).where(eq(devis.userId, userId)),
      db.select().from(supplierOrders).where(eq(supplierOrders.userId, userId)),
      db.select().from(prescriptions).where(eq(prescriptions.userId, userId)),
      db.select().from(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId)),
      db.select().from(lensOrders).where(eq(lensOrders.userId, userId)),
      db.execute(sql`SELECT id, user_id, name, email, phone, address, city, ice, "if", rc, tax_id, category, payment_terms, payment_method, bank, rib, notes, status, current_balance, created_at, updated_at FROM suppliers WHERE user_id = ${userId}`).then((res: any) => res.rows || []),
      db.select().from(shopProfiles).where(eq(shopProfiles.userId, userId)),
      db.select().from(settings).where(eq(settings.userId, userId)),
      db.select().from(stockMovements).where(eq(stockMovements.userId, userId)),
      db.select().from(reminders).where(eq(reminders.userId, userId)),
      db.select().from(brands).where(eq(brands.userId, userId)),
      db.select().from(categories).where(eq(categories.userId, userId)),
      db.select().from(materials).where(eq(materials.userId, userId)),
      db.select().from(colors).where(eq(colors.userId, userId)),
      db.select().from(treatments).where(eq(treatments.userId, userId)),
      db.select().from(mountingTypes).where(eq(mountingTypes.userId, userId)),
      db.select().from(banks).where(eq(banks.userId, userId)),
      db.select().from(insurances).where(eq(insurances.userId, userId))
    ]);

    // Build backup object with metadata
    const backup = {
      metadata: {
        version: '1.2',
        exportDate: new Date().toISOString(),
        userId: userId,
        userEmail: session.user.email,
        appVersion: 'OptiManager Pro v3'
      },
      data: {
        clients: clientsData,
        products: productsData,
        sales: salesData,
        devis: devisData,
        supplierOrders: supplierOrdersData,
        prescriptions: prescriptionsData,
        contactLensPrescriptions: contactLensPrescriptionsData,
        lensOrders: lensOrdersData,
        suppliers: suppliersData,
        shopProfiles: shopProfilesData,
        settings: settingsData,
        stockMovements: stockMovementsData,
        reminders: remindersData,
        brands: brandsData,
        categories: categoriesData,
        materials: materialsData,
        colors: colorsData,
        treatments: treatmentsData,
        mountingTypes: mountingTypesData,
        banks: banksData,
        insurances: insurancesData
      },
      statistics: {
        totalClients: clientsData.length,
        totalProducts: productsData.length,
        totalSales: salesData.length,
        totalDevis: devisData.length,
        totalSupplierOrders: supplierOrdersData.length,
        totalRecords: 
          clientsData.length + productsData.length + salesData.length + devisData.length +
          prescriptionsData.length + contactLensPrescriptionsData.length + lensOrdersData.length
      }
    };

    // Compress data
    const jsonString = JSON.stringify(backup);
    const compressed = await gzipAsync(Buffer.from(jsonString));
    
    return compressed.toString('base64');

  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error('Erreur lors de l\'export des données');
  }
}

/**
 * Helper: Convert date strings to Date objects recursively
 */
function sanitizeDates(obj: any): any {
    if (!obj) return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeDates(item));
    }
    
    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            const value = obj[key];
            
            // Check if this looks like a date field and contains a date string
            if ((key === 'createdAt' || key === 'updatedAt' || key === 'date' || key === 'dueDate' || key === 'expiryDate' || key.toLowerCase().includes('date')) 
                && typeof value === 'string' 
                && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
                sanitized[key] = new Date(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeDates(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    
    return obj;
}

/**
 * Restore user data from backup file
 * Completely replaces existing data with backup data
 */
export async function restoreUserData(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Non authentifié');
    const userId = session.user.id;

    const file = formData.get('file') as File;
    if (!file) throw new Error('Aucun fichier fourni');

    try {
        console.log("🚀 Début de la restauration...");
        const buffer = Buffer.from(await file.arrayBuffer());
        console.log(`📦 Taille du fichier reçu: ${buffer.length} bytes`);

        let jsonString: string;
        let parsedBackup: any;

        // Smart Detection: Check for GZIP magic bytes (0x1F 0x8B)
        const isGzip = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
        
        try {
            if (isGzip) {
                console.log('🔄 Restore: GZIP format detected. Decompressing...');
                const decompressed = await gunzipAsync(buffer);
                jsonString = decompressed.toString('utf-8');
                parsedBackup = JSON.parse(jsonString);
                console.log("✅ Succès : Format GZIP détecté et parsé");
            } else {
                console.log('📄 Restore: Raw JSON format detected.');
                // Robust cleanup: trim whitespace and potential BOM
                jsonString = buffer.toString('utf-8').trim();
                // Remove BOM if present (rare but possible)
                if (jsonString.charCodeAt(0) === 0xFEFF) {
                    jsonString = jsonString.slice(1);
                }
                parsedBackup = JSON.parse(jsonString);
                console.log("✅ Succès : Format JSON brut détecté et parsé");
            }
        } catch (error) {
            console.error("❌ Erreur de lecture/parsing:", error);
            throw new Error("Le fichier est illisible (Ni GZIP, ni JSON valide).");
        }

        // Structure validation
        if (!parsedBackup || !parsedBackup.metadata || !parsedBackup.data) {
            console.error("❌ Structure invalide:", Object.keys(parsedBackup || {}));
            throw new Error("Structure du backup invalide (Manque metadata ou data)");
        }

        const backup = parsedBackup;

        // Security check
        if (backup.metadata?.userId && backup.metadata.userId !== userId) {
            console.warn("⚠️ Backup userId mismatch, proceeding anyway...");
        }

        console.log("🔧 Sanitization des dates...");
        const data = sanitizeDates(backup.data);
        console.log("✅ Dates converties en objets Date");

        // Transaction with granular logging
        await db.transaction(async (tx: DrizzleTx) => {
            console.log("🗑️ Phase 1: Suppression des données existantes...");
            
            // 1. DELETE EVERYTHING (Child tables first)
            await tx.delete(lensOrders).where(eq(lensOrders.userId, userId));
            await tx.delete(prescriptions).where(eq(prescriptions.userId, userId));
            await tx.delete(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId));
            await tx.delete(stockMovements).where(eq(stockMovements.userId, userId));
            await tx.delete(reminders).where(eq(reminders.userId, userId));
            
            // Delete middle tables
            await tx.delete(sales).where(eq(sales.userId, userId));
            await tx.delete(devis).where(eq(devis.userId, userId));
            await tx.delete(supplierOrders).where(eq(supplierOrders.userId, userId));
            
            // Delete parent tables
            await tx.delete(clients).where(eq(clients.userId, userId));
            await tx.delete(products).where(eq(products.userId, userId));
            await tx.delete(suppliers).where(eq(suppliers.userId, userId));
            await tx.delete(shopProfiles).where(eq(shopProfiles.userId, userId));
            await tx.delete(settings).where(eq(settings.userId, userId));
            
            // Delete settings enums
            await tx.delete(brands).where(eq(brands.userId, userId));
            await tx.delete(categories).where(eq(categories.userId, userId));
            await tx.delete(materials).where(eq(materials.userId, userId));
            await tx.delete(colors).where(eq(colors.userId, userId));
            await tx.delete(treatments).where(eq(treatments.userId, userId));
            await tx.delete(mountingTypes).where(eq(mountingTypes.userId, userId));
            await tx.delete(banks).where(eq(banks.userId, userId));
            await tx.delete(insurances).where(eq(insurances.userId, userId));

            console.log("✅ Suppression terminée");
            console.log("📥 Phase 2: Insertion des données du backup...");

            // 2. INSERT EVERYTHING (Parent tables first) with granular error handling
            // Settings enums
            if (data.brands?.length > 0) {
                try {
                    await tx.insert(brands).values(data.brands);
                    console.log(`✅ Brands: ${data.brands.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Brands:", error);
                    throw new Error(`Échec insertion Brands: ${(error as Error).message}`);
                }
            }

            if (data.categories?.length > 0) {
                try {
                    await tx.insert(categories).values(data.categories);
                    console.log(`✅ Categories: ${data.categories.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Categories:", error);
                    throw new Error(`Échec insertion Categories: ${(error as Error).message}`);
                }
            }

            if (data.materials?.length > 0) {
                try {
                    await tx.insert(materials).values(data.materials);
                    console.log(`✅ Materials: ${data.materials.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Materials:", error);
                    throw new Error(`Échec insertion Materials: ${(error as Error).message}`);
                }
            }

            if (data.colors?.length > 0) {
                try {
                    await tx.insert(colors).values(data.colors);
                    console.log(`✅ Colors: ${data.colors.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Colors:", error);
                    throw new Error(`Échec insertion Colors: ${(error as Error).message}`);
                }
            }

            if (data.treatments?.length > 0) {
                try {
                    await tx.insert(treatments).values(data.treatments);
                    console.log(`✅ Treatments: ${data.treatments.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Treatments:", error);
                    throw new Error(`Échec insertion Treatments: ${(error as Error).message}`);
                }
            }

            if (data.mountingTypes?.length > 0) {
                try {
                    await tx.insert(mountingTypes).values(data.mountingTypes);
                    console.log(`✅ MountingTypes: ${data.mountingTypes.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion MountingTypes:", error);
                    throw new Error(`Échec insertion MountingTypes: ${(error as Error).message}`);
                }
            }

            if (data.banks?.length > 0) {
                try {
                    await tx.insert(banks).values(data.banks);
                    console.log(`✅ Banks: ${data.banks.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Banks:", error);
                    throw new Error(`Échec insertion Banks: ${(error as Error).message}`);
                }
            }

            if (data.insurances?.length > 0) {
                try {
                    await tx.insert(insurances).values(data.insurances);
                    console.log(`✅ Insurances: ${data.insurances.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Insurances:", error);
                    throw new Error(`Échec insertion Insurances: ${(error as Error).message}`);
                }
            }

            // Core tables
            if (data.shopProfiles?.length > 0) {
                try {
                    await tx.insert(shopProfiles).values(data.shopProfiles);
                    console.log(`✅ ShopProfiles: ${data.shopProfiles.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion ShopProfiles:", error);
                    throw new Error(`Échec insertion ShopProfiles: ${(error as Error).message}`);
                }
            }

            if (data.settings?.length > 0) {
                try {
                    await tx.insert(settings).values(data.settings);
                    console.log(`✅ Settings: ${data.settings.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Settings:", error);
                    throw new Error(`Échec insertion Settings: ${(error as Error).message}`);
                }
            }

            if (data.suppliers?.length > 0) {
                try {
                    await tx.insert(suppliers).values(data.suppliers);
                    console.log(`✅ Suppliers: ${data.suppliers.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Suppliers:", error);
                    throw new Error(`Échec insertion Suppliers: ${(error as Error).message}`);
                }
            }

            if (data.clients?.length > 0) {
                try {
                    await tx.insert(clients).values(data.clients);
                    console.log(`✅ Clients: ${data.clients.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Clients:", error);
                    throw new Error(`Échec insertion Clients: ${(error as Error).message}`);
                }
            }

            if (data.products?.length > 0) {
                try {
                    await tx.insert(products).values(data.products);
                    console.log(`✅ Products: ${data.products.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Products:", error);
                    throw new Error(`Échec insertion Products: ${(error as Error).message}`);
                }
            }

            // Transaction tables
            if (data.sales?.length > 0) {
                try {
                    await tx.insert(sales).values(data.sales);
                    console.log(`✅ Sales: ${data.sales.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Sales:", error);
                    throw new Error(`Échec insertion Sales: ${(error as Error).message}`);
                }
            }

            if (data.devis?.length > 0) {
                try {
                    await tx.insert(devis).values(data.devis);
                    console.log(`✅ Devis: ${data.devis.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Devis:", error);
                    throw new Error(`Échec insertion Devis: ${(error as Error).message}`);
                }
            }

            if (data.supplierOrders?.length > 0) {
                try {
                    await tx.insert(supplierOrders).values(data.supplierOrders);
                    console.log(`✅ SupplierOrders: ${data.supplierOrders.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion SupplierOrders:", error);
                    throw new Error(`Échec insertion SupplierOrders: ${(error as Error).message}`);
                }
            }
            
            // Other tables
            if (data.prescriptions?.length > 0) {
                try {
                    await tx.insert(prescriptions).values(data.prescriptions);
                    console.log(`✅ Prescriptions: ${data.prescriptions.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Prescriptions:", error);
                    throw new Error(`Échec insertion Prescriptions: ${(error as Error).message}`);
                }
            }

            if (data.contactLensPrescriptions?.length > 0) {
                try {
                    await tx.insert(contactLensPrescriptions).values(data.contactLensPrescriptions);
                    console.log(`✅ ContactLensPrescriptions: ${data.contactLensPrescriptions.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion ContactLensPrescriptions:", error);
                    throw new Error(`Échec insertion ContactLensPrescriptions: ${(error as Error).message}`);
                }
            }

            if (data.lensOrders?.length > 0) {
                try {
                    await tx.insert(lensOrders).values(data.lensOrders);
                    console.log(`✅ LensOrders: ${data.lensOrders.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion LensOrders:", error);
                    throw new Error(`Échec insertion LensOrders: ${(error as Error).message}`);
                }
            }

            if (data.stockMovements?.length > 0) {
                try {
                    await tx.insert(stockMovements).values(data.stockMovements);
                    console.log(`✅ StockMovements: ${data.stockMovements.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion StockMovements:", error);
                    throw new Error(`Échec insertion StockMovements: ${(error as Error).message}`);
                }
            }

            if (data.reminders?.length > 0) {
                try {
                    await tx.insert(reminders).values(data.reminders);
                    console.log(`✅ Reminders: ${data.reminders.length} insérés`);
                } catch (error) {
                    console.error("❌ Erreur insertion Reminders:", error);
                    throw new Error(`Échec insertion Reminders: ${(error as Error).message}`);
                }
            }

            console.log("✅ Toutes les données ont été restaurées avec succès");
        });

        revalidatePath('/');
        console.log("🎉 Restauration terminée avec succès");
        return { success: true, count: backup.statistics?.totalRecords || 0 };
    } catch (error) {
        console.error('Restore error:', error);
        throw new Error('Échec de la restauration: ' + (error as Error).message);
    }
}

/**
 * Connect to reset (format) user account
 * Deletes all business data but keeps account
 */
export async function resetUserAccount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non authentifié');
  const userId = session.user.id;

  try {
    await db.transaction(async (tx: DrizzleTx) => {
        // DELETE EVERYTHING (Child tables first)
        await tx.delete(lensOrders).where(eq(lensOrders.userId, userId));
        await tx.delete(prescriptions).where(eq(prescriptions.userId, userId));
        await tx.delete(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId));
        await tx.delete(stockMovements).where(eq(stockMovements.userId, userId));
        await tx.delete(reminders).where(eq(reminders.userId, userId));
        
        // Delete middle tables
        await tx.delete(sales).where(eq(sales.userId, userId));
        await tx.delete(devis).where(eq(devis.userId, userId));
        await tx.delete(supplierOrders).where(eq(supplierOrders.userId, userId));
        
        // Delete parent tables
        await tx.delete(clients).where(eq(clients.userId, userId));
        await tx.delete(products).where(eq(products.userId, userId));
        await tx.delete(suppliers).where(eq(suppliers.userId, userId));
        await tx.delete(shopProfiles).where(eq(shopProfiles.userId, userId));
        await tx.delete(settings).where(eq(settings.userId, userId));
        
        // Delete settings enums
        await tx.delete(brands).where(eq(brands.userId, userId));
        await tx.delete(categories).where(eq(categories.userId, userId));
        await tx.delete(materials).where(eq(materials.userId, userId));
        await tx.delete(colors).where(eq(colors.userId, userId));
        await tx.delete(treatments).where(eq(treatments.userId, userId));
        await tx.delete(mountingTypes).where(eq(mountingTypes.userId, userId));
        await tx.delete(banks).where(eq(banks.userId, userId));
        await tx.delete(insurances).where(eq(insurances.userId, userId));
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Reset error:', error);
    throw new Error('Échec de la réinitialisation: ' + (error as Error).message);
  }
}

/**
 * Get backup stats
 */
export async function getBackupStats() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const userId = session.user.id;

  try {
    const [
      clientsCount,
      productsCount,
      salesCount,
      devisCount
    ] = await Promise.all([
      db.select().from(clients).where(eq(clients.userId, userId)),
      db.select().from(products).where(eq(products.userId, userId)),
      db.select().from(sales).where(eq(sales.userId, userId)),
      db.select().from(devis).where(eq(devis.userId, userId))
    ]);

    return {
      totalRecords: clientsCount.length + productsCount.length + salesCount.length + devisCount.length,
      clients: clientsCount.length,
      products: productsCount.length,
      sales: salesCount.length,
      devis: devisCount.length
    };
  } catch (error) {
    console.error('Error getting backup stats:', error);
    return null;
  }
}
