'use server';

import { db } from '@/db';
import {
  clients, products, sales, devis,
  supplierOrders, supplierOrderItems, supplierPayments,
  prescriptions, prescriptionsLegacy, contactLensPrescriptions, lensOrders,
  suppliers, shopProfiles, settings, stockMovements,
  reminders, brands, categories, materials, colors,
  treatments, mountingTypes, banks, insurances,
  saleItems, saleLensDetails, saleContactLensDetails
} from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql, inArray } from 'drizzle-orm';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { revalidatePath } from 'next/cache';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4: uuidv4 } = require('uuid') as { v4: () => string };

const gzipAsync   = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sanitizeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d as unknown as T;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeDates) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>))
      result[k] = sanitizeDates(v);
    return result as T;
  }
  return obj;
}

const idMap = new Map<string, string>();

function migrateId(id: unknown, isLegacy: boolean): string {
  if (!id) return uuidv4();
  const key = String(id);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  if (!isLegacy || isUUID) {
    if (!idMap.has(key)) idMap.set(key, key);
    return key;
  }
  if (!idMap.has(key)) idMap.set(key, uuidv4());
  return idMap.get(key)!;
}

function fk(id: unknown): string | null {
  if (!id) return null;
  return idMap.get(String(id)) ?? null;
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

export async function exportUserData(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non authentifié');
  const userId = session.user.id;

  const [
    clientsData, productsData, salesData, devisData,
    supplierOrdersData, supplierOrderItemsData, supplierPaymentsData,
    prescriptionsData, contactLensPrescriptionsData, lensOrdersData,
    suppliersData, shopProfilesData, settingsData, stockMovementsData,
    remindersData, brandsData, categoriesData, materialsData,
    colorsData, treatmentsData, mountingTypesData, banksData, insurancesData,
  ] = await Promise.all([
    db.select().from(clients).where(eq(clients.userId, userId)),
    db.select().from(products).where(eq(products.userId, userId)),
    db.select().from(sales).where(eq(sales.userId, userId)),
    db.select().from(devis).where(eq(devis.userId, userId)),
    db.select().from(supplierOrders).where(eq(supplierOrders.userId, userId)),
    db.execute(sql`SELECT * FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${userId})`).then(res => res.rows),
    db.select().from(supplierPayments).where(eq(supplierPayments.userId, userId)),
    db.select().from(prescriptions).where(eq(prescriptions.userId, userId)),
    db.select().from(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId)),
    db.select().from(lensOrders).where(eq(lensOrders.userId, userId)),
    db.select().from(suppliers).where(eq(suppliers.userId, userId)),
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
    db.select().from(insurances).where(eq(insurances.userId, userId)),
  ]);

  const backup = {
    metadata: {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      counts: {
        clients: clientsData.length,
        products: productsData.length,
        sales: salesData.length,
        suppliers: suppliersData.length,
        prescriptions: prescriptionsData.length,
        total: clientsData.length + productsData.length + salesData.length,
      },
    },
    data: {
      clients: clientsData, products: productsData, sales: salesData,
      devis: devisData, supplierOrders: supplierOrdersData,
      supplierOrderItems: supplierOrderItemsData,
      supplierPayments: supplierPaymentsData,
      prescriptions: prescriptionsData,
      contactLensPrescriptions: contactLensPrescriptionsData,
      lensOrders: lensOrdersData, suppliers: suppliersData,
      shopProfiles: shopProfilesData, settings: settingsData,
      stockMovements: stockMovementsData, reminders: remindersData,
      brands: brandsData, categories: categoriesData,
      materials: materialsData, colors: colorsData,
      treatments: treatmentsData, mountingTypes: mountingTypesData,
      banks: banksData, insurances: insurancesData,
    },
  };

  const json = JSON.stringify(backup, (_, val) =>
    typeof val === 'bigint' ? val.toString() : val
  );
  const compressed = await gzipAsync(Buffer.from(json, 'utf-8'));
  return compressed.toString('base64');
}

// ─────────────────────────────────────────────
// RESTORE
// ─────────────────────────────────────────────

export async function restoreUserData(base64Data: any) {
  // Extract base64 from FormData if necessary
  let base64 = "";
  if (base64Data instanceof FormData) {
     const file = base64Data.get('file') as File;
     if (!file) throw new Error('Aucun fichier fourni');
     const buffer = Buffer.from(await file.arrayBuffer());
     
     // Detect GZIP logic handling (same as old implementation handled internally)
     const isGzip = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
     if (isGzip) {
       base64 = buffer.toString('base64');
     } else {
       // Support raw JSON for flexibility
       const jsonString = buffer.toString('utf-8').trim();
       base64 = (await gzipAsync(Buffer.from(jsonString, 'utf-8'))).toString('base64');
     }
  } else {
     base64 = base64Data as string;
  }

  const session = await auth();
  if (!session?.user?.id) throw new Error('Non authentifié');
  const userId = session.user.id;

  // 1. Decompress + parse
  const compressed = Buffer.from(base64, 'base64');
  const json = (await gunzipAsync(compressed)).toString('utf-8');
  const backup = JSON.parse(json);
  const data = backup.data ?? backup; // backward compat

  // 2. Legacy detection
  const backupVersion = backup.metadata?.version ?? '1.0';
  const isLegacy = parseFloat(backupVersion) < 2.0;
  idMap.clear(); // reset map pour chaque restore

  // 3. Sanitize all dates
  const d = sanitizeDates(data);

  await db.transaction(async (tx) => {

    // ── Helpers inside tx ──
    const ins = async (table: any, rows: any[]) => {
      if (!rows?.length) return;
      for (let i = 0; i < rows.length; i += 100)
        await tx.insert(table).values(rows.slice(i, i + 100)).onConflictDoNothing();
    };

    // ── DELETE existing user data (reverse FK order) ──
    await tx.delete(lensOrders).where(eq(lensOrders.userId, userId));
    await tx.delete(stockMovements).where(eq(stockMovements.userId, userId));
    await tx.delete(reminders).where(eq(reminders.userId, userId));
    await tx.delete(supplierPayments).where(eq(supplierPayments.userId, userId));
    await tx.execute(sql`DELETE FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${userId})`);
    await tx.delete(supplierOrders).where(eq(supplierOrders.userId, userId));
    await tx.delete(devis).where(eq(devis.userId, userId));
    await tx.delete(sales).where(eq(sales.userId, userId));
    await tx.delete(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId));
    await tx.delete(prescriptions).where(eq(prescriptions.userId, userId));
    await tx.delete(clients).where(eq(clients.userId, userId));
    await tx.delete(products).where(eq(products.userId, userId));
    await tx.delete(suppliers).where(eq(suppliers.userId, userId));
    await tx.delete(insurances).where(eq(insurances.userId, userId));
    await tx.delete(banks).where(eq(banks.userId, userId));
    await tx.delete(mountingTypes).where(eq(mountingTypes.userId, userId));
    await tx.delete(treatments).where(eq(treatments.userId, userId));
    await tx.delete(colors).where(eq(colors.userId, userId));
    await tx.delete(materials).where(eq(materials.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(brands).where(eq(brands.userId, userId));
    await tx.delete(settings).where(eq(settings.userId, userId));
    await tx.delete(shopProfiles).where(eq(shopProfiles.userId, userId));

    // ── 1. Lookup tables ──
    await ins(brands,       (d.brands ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(categories,   (d.categories ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(materials,    (d.materials ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(colors,       (d.colors ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(treatments,   (d.treatments ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(mountingTypes,(d.mountingTypes ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(banks,        (d.banks ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(insurances,   (d.insurances ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));

    // ── 2. Shop config ──
    await ins(shopProfiles, (d.shopProfiles ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(settings,     (d.settings ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));

    // ── 3. Suppliers (parent) ──
    await ins(suppliers, (d.suppliers ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));

    // ── 4. Prescriptions (parent of sales & lensOrders) ──
    await ins(prescriptions, (d.prescriptions ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(contactLensPrescriptions, (d.contactLensPrescriptions ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));

    // ── 5. Clients + Products ──
    await ins(clients,  (d.clients ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));
    await ins(products, (d.products ?? []).map((r: any) => ({ ...r, userId, id: migrateId(r.id, isLegacy) })));

    // ── 6. Sales + Devis ──
    await ins(sales, (d.sales ?? []).map((r: any) => ({
      ...r, userId,
      id: migrateId(r.id, isLegacy),
      clientId:        fk(r.clientId),
      prescriptionId:  fk(r.prescriptionId),
    })));
    await ins(devis, (d.devis ?? []).map((r: any) => ({
      ...r, userId,
      id: migrateId(r.id, isLegacy),
      clientId: fk(r.clientId),
    })));

    // ── 7. Supplier chain ──
    await ins(supplierOrders, (d.supplierOrders ?? []).map((r: any) => ({
      ...r, userId,
      id:         migrateId(r.id, isLegacy),
      supplierId: fk(r.supplierId),
    })));
    await ins(supplierOrderItems, (d.supplierOrderItems ?? []).map((r: any) => ({
      ...r, userId,
      id:      migrateId(r.id, isLegacy),
      orderId: fk(r.orderId),
    })));
    await ins(supplierPayments, (d.supplierPayments ?? []).map((r: any) => ({
      ...r, userId,
      id:         migrateId(r.id, isLegacy),
      supplierId: fk(r.supplierId),
      orderId:    fk(r.orderId),
    })));

    // ── 8. Lens Orders ──
    await ins(lensOrders, (d.lensOrders ?? []).map((r: any) => ({
      ...r, userId,
      id:               migrateId(r.id, isLegacy),
      supplierOrderId:  fk(r.supplierOrderId),
      prescriptionId:   fk(r.prescriptionId),
      clientId:         fk(r.clientId),
    })));

    // ── 9. Stock + Reminders ──
    await ins(stockMovements, (d.stockMovements ?? []).map((r: any) => ({
      ...r, userId,
      id:        migrateId(r.id, isLegacy),
      productId: fk(r.productId),
    })));
    await ins(reminders, (d.reminders ?? []).map((r: any) => ({
      ...r, userId,
      id:       migrateId(r.id, isLegacy),
      clientId: fk(r.clientId),
    })));
  });

  // ── Post-restore validation ──
  // Reusing existing drizzle logic:
  const { count } = await import('drizzle-orm');
  const [c, p, s, sup, pres] = await Promise.all([
      db.select({ n: count() }).from(clients).where(eq(clients.userId, userId)),
      db.select({ n: count() }).from(products).where(eq(products.userId, userId)),
      db.select({ n: count() }).from(sales).where(eq(sales.userId, userId)),
      db.select({ n: count() }).from(suppliers).where(eq(suppliers.userId, userId)),
      db.select({ n: count() }).from(prescriptions).where(eq(prescriptions.userId, userId)),
  ]);

  revalidatePath('/dashboard');

  return {
    success: true,
    backupVersion,
    validation: {
      clients:       { expected: d.clients?.length ?? 0,       restored: c[0].n },
      products:      { expected: d.products?.length ?? 0,      restored: p[0].n },
      sales:         { expected: d.sales?.length ?? 0,         restored: s[0].n },
      suppliers:     { expected: d.suppliers?.length ?? 0,     restored: sup[0].n },
      prescriptions: { expected: d.prescriptions?.length ?? 0, restored: pres[0].n },
    },
  };
}

// ─────────────────────────────────────────────
// RESET ACCOUNT
// ─────────────────────────────────────────────

export async function resetUserAccount() {
  try {
    // 1. التأكد من أن المستخدم مكونيكطي
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Non autorisé. Utilisateur introuvable." };
    }

    const userId = session.user.id;

    // 2. بداية الـ Transaction (Atomicité)
    await db.transaction(async (tx) => {
      
      // ==========================================
      // 🔹 Phase 1 : Détacher les liaisons optionnelles (Soft Break)
      // ==========================================
      await tx.update(devis)
        .set({ saleId: null })
        .where(eq(devis.userId, userId));
        
      await tx.update(lensOrders)
        .set({ saleId: null })
        .where(eq(lensOrders.userId, userId));


      // ==========================================
      // 🔹 Phase 2 : Supprimer les enfants profonds (Deepest Children)
      // ==========================================
      // جيب الـ IDs ديال المبيعات (Sales) باش نمسحو التفاصيل ديالهم
      const userSales = await tx.select({ id: sales.id }).from(sales).where(eq(sales.userId, userId));
      const saleIds = userSales.map(s => s.id);

      if (saleIds.length > 0) {
        // Fetch saleItems to delete their deepest children
        const userSaleItems = await tx.select({ id: saleItems.id }).from(saleItems).where(inArray(saleItems.saleId, saleIds));
        const saleItemIds = userSaleItems.map(si => si.id);
        
        if (saleItemIds.length > 0) {
          await tx.delete(saleLensDetails).where(inArray(saleLensDetails.saleItemId, saleItemIds));
          await tx.delete(saleContactLensDetails).where(inArray(saleContactLensDetails.saleItemId, saleItemIds));
        }
        await tx.delete(saleItems).where(inArray(saleItems.saleId, saleIds));
      }


      // ==========================================
      // 🔹 Phase 3 : Supprimer les modules raccordés
      // ==========================================
      await tx.delete(lensOrders).where(eq(lensOrders.userId, userId));
      await tx.delete(contactLensPrescriptions).where(eq(contactLensPrescriptions.userId, userId));
      await tx.delete(prescriptionsLegacy).where(eq(prescriptionsLegacy.userId, userId));
      await tx.delete(stockMovements).where(eq(stockMovements.userId, userId));
      await tx.delete(reminders).where(eq(reminders.userId, userId));
      await tx.delete(sales).where(eq(sales.userId, userId));
      await tx.delete(devis).where(eq(devis.userId, userId));

      // جيب الـ IDs ديال طلبات الموردين باش نمسحو الـ items ديالهم
      const userSupplierOrders = await tx.select({ id: supplierOrders.id }).from(supplierOrders).where(eq(supplierOrders.userId, userId));
      const supplierOrderIds = userSupplierOrders.map(o => o.id);

      if (supplierOrderIds.length > 0) {
        await tx.delete(supplierOrderItems).where(inArray(supplierOrderItems.orderId, supplierOrderIds));
      }

      await tx.delete(supplierPayments).where(eq(supplierPayments.userId, userId));
      await tx.delete(supplierOrders).where(eq(supplierOrders.userId, userId));
      await tx.delete(suppliers).where(eq(suppliers.userId, userId));


      // ==========================================
      // 🔹 Phase 4 : Supprimer les parents majeurs
      // ==========================================
      await tx.delete(clients).where(eq(clients.userId, userId));
      await tx.delete(products).where(eq(products.userId, userId));


      // ==========================================
      // 🔹 Phase 5 : Supprimer la configuration de la boutique
      // ==========================================
      await tx.delete(shopProfiles).where(eq(shopProfiles.userId, userId));
      await tx.delete(settings).where(eq(settings.userId, userId));
      
      // Supprimer les listes (Tables de référence)
      await tx.delete(brands).where(eq(brands.userId, userId));
      await tx.delete(categories).where(eq(categories.userId, userId));
      await tx.delete(materials).where(eq(materials.userId, userId));
      await tx.delete(colors).where(eq(colors.userId, userId));
      await tx.delete(treatments).where(eq(treatments.userId, userId));
      await tx.delete(mountingTypes).where(eq(mountingTypes.userId, userId));
      await tx.delete(banks).where(eq(banks.userId, userId));
      await tx.delete(insurances).where(eq(insurances.userId, userId));

    });

    // 3. إرجاع النتيجة بنجاح
    return { success: true, message: "Toutes les données ont été effacées avec succès." };

  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation du compte:", error);
    return { 
      success: false, 
      error: "Une erreur est survenue lors de la réinitialisation. Opération annulée: " + error.message
    };
  }
}
export async function getBackupStats() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Non authentifié');
    const userId = session.user.id;
    
    const { count } = await import('drizzle-orm');
    const [c, p, s, sup] = await Promise.all([
      db.select({ n: count() }).from(clients).where(eq(clients.userId, userId)),
      db.select({ n: count() }).from(products).where(eq(products.userId, userId)),
      db.select({ n: count() }).from(sales).where(eq(sales.userId, userId)),
      db.select({ n: count() }).from(suppliers).where(eq(suppliers.userId, userId))
    ]);
    
    return {
        clients: c[0].n,
        products: p[0].n,
        sales: s[0].n,
        suppliers: sup[0].n
    };
}
