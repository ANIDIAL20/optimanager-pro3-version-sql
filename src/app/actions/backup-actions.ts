'use server';

import { db } from '@/db';
import * as s from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql } from 'drizzle-orm';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid'; // ✅ FIX 1 — ES import au lieu de require()

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// ✅ FIX 2 — sanitizeDates corrigé (dead code supprimé)
// AVANT : le check `typeof obj === 'string'` était APRÈS `if typeof !== 'object' return obj`
//         donc les strings étaient retournées avant d'atteindre la conversion → les dates
//         sous forme de string n'étaient JAMAIS converties.
// APRÈS : on vérifie le string EN PREMIER.
function sanitizeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(obj)) {
    const d = new Date(obj);
    return isNaN(d.getTime()) ? obj : d;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDates);
  const res: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    res[k] = sanitizeDates(v);
  }
  return res;
}

// ✅ FIX 3 — idMap déplacé DANS les fonctions (plus module-level)
// AVANT : `const idMap = new Map()` au niveau du module = persistait entre les requêtes
//         en production (serveur Node.js stateful) → corruption des IDs entre utilisateurs.
// APRÈS : créé localement dans chaque fonction qui en a besoin.
function createIdHelpers() {
  const idMap = new Map<string, string>();

  const migrateId = (id: unknown, isLegacy: boolean): string => {
    if (!id) return uuidv4();
    const k = String(id);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(k);
    if (!isLegacy || isUUID) { if (!idMap.has(k)) idMap.set(k, k); return k; }
    if (!idMap.has(k)) idMap.set(k, uuidv4());
    return idMap.get(k)!;
  };

  const migrateIntId = (id: unknown) => Number(id);
  const fk = (id: unknown) => id ? (idMap.get(String(id)) || null) : null;
  const fkInt = (id: unknown) => id ? Number(id) : null;

  return { migrateId, migrateIntId, fk, fkInt };
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

// ✅ FIX 4 — exportUserData wrappé dans try/catch
// AVANT : aucun try/catch → toute erreur DB remontait comme exception non gérée
//         → le client recevait "Impossible d'exporter les données" sans détail.
// APRÈS : erreur loggée + message explicite retourné.
export async function exportUserData(): Promise<{ success: boolean; data?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Non authentifié' };
  const uId = session.user.id;

  try {
    const tables = [
      'clients', 'products', 'sales', 'devis', 'brands', 'categories', 'materials', 'colors',
      'treatments', 'mountingTypes', 'banks', 'insurances', 'prescriptions',
      'contactLensPrescriptions', 'lensOrders', 'suppliers', 'supplierOrders',
      'supplierPayments', 'supplierOrderPayments', 'supplierCredits', 'supplierCreditAllocations',
      'goodsReceipts', 'shopProfiles', 'settings', 'reminders', 'stockMovements', 'expenses',
      'clientTransactions', 'cashSessions', 'cashMovements', 'comptabiliteJournal', 'purchases',
      'auditLogs', 'reservations', 'notifications', 'clientInteractions',
      'invoiceImports'
    ];

    const data: Record<string, unknown[]> = {};

    await Promise.all(tables.map(async (t) => {
      if ((s as any)[t]) {
        try {
          data[t] = await db.select().from((s as any)[t]).where(
            eq((s as any)[t].userId, uId)
          );
        } catch (tableErr) {
          console.warn(`[exportUserData] Erreur lecture table "${t}":`, tableErr);
          data[t] = [];
        }
      }
    }));

    data.frameReservations = await db
      .select()
      .from(s.frameReservations)
      .where(eq(s.frameReservations.storeId, uId));

    // Tables relationnelles sans userId direct
    data.saleItems = await db.execute(
      sql`SELECT * FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId})`
    ).then(r => r.rows);

    data.saleLensDetails = await db.execute(
      sql`SELECT * FROM sale_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`
    ).then(r => r.rows);

    data.saleContactLensDetails = await db.execute(
      sql`SELECT * FROM sale_contact_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`
    ).then(r => r.rows);

    data.supplierOrderItems = await db.execute(
      sql`SELECT * FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${uId})`
    ).then(r => r.rows);

    data.goodsReceiptItems = await db.execute(
      sql`SELECT * FROM goods_receipt_items WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE user_id = ${uId})`
    ).then(r => r.rows);

    const backup = {
      metadata: { version: '3.0', exportedAt: new Date().toISOString() },
      data,
    };

    const json = JSON.stringify(backup, (_, v) => typeof v === 'bigint' ? v.toString() : v);
    const b64 = (await gzipAsync(Buffer.from(json, 'utf-8'))).toString('base64');
    
    return { success: true, data: b64 };

  } catch (error) {
    console.error('[exportUserData] ERREUR COMPLÈTE:', error);
    return {
      success: false,
      error: error instanceof Error ? `Export échoué : ${error.message}` : 'Export échoué : erreur inconnue'
    };
  }
}

// ─────────────────────────────────────────────
// RESTORE
// ─────────────────────────────────────────────

export async function restoreUserData(base64Data: FormData | string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Non authentifié' };
  const uId = session.user.id;

  try {
    let b64 = '';
    if (base64Data instanceof FormData) {
      const f = base64Data.get('file') as File;
      if (!f) throw new Error('Fichier manquant dans FormData');
      const buf = Buffer.from(await f.arrayBuffer());
      b64 = (buf[0] === 0x1f && buf[1] === 0x8b)
        ? buf.toString('base64')
        : (await gzipAsync(buf)).toString('base64');
    } else {
      b64 = base64Data;
    }

    const backup = JSON.parse((await gunzipAsync(Buffer.from(b64, 'base64'))).toString('utf-8'));
    const d = sanitizeDates(backup.data || backup) as Record<string, unknown[]>;
    const isLegacy = parseFloat(backup.metadata?.version || '1.0') < 2.0;

    // ✅ idMap local — pas de pollution entre requêtes
    const { migrateId, migrateIntId, fk, fkInt } = createIdHelpers();

    await db.transaction(async (tx) => {
      const del = async (t: Parameters<typeof tx.delete>[0]) =>
        tx.delete(t).where(eq((t as any).userId as Parameters<typeof eq>[0], uId));

      const ins = async (t: Parameters<typeof tx.insert>[0], rows: any[]) => {
        if (!rows?.length) return;
        for (let i = 0; i < rows.length; i += 100) {
          await tx.insert(t).values(rows.slice(i, i + 100) as any).onConflictDoNothing();
        }
      };

      // DELETE — ordre respectant les Foreign Keys (enfants avant parents)
      await tx.execute(sql`DELETE FROM sale_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`);
      await tx.execute(sql`DELETE FROM sale_contact_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`);
      await tx.execute(sql`DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId})`);
      await tx.execute(sql`DELETE FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${uId})`);
      await tx.execute(sql`DELETE FROM goods_receipt_items WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE user_id = ${uId})`);

      await del(s.goodsReceipts); await del(s.supplierCreditAllocations); await del(s.supplierCredits);
      await del(s.lensOrders); await del(s.stockMovements); await del(s.reminders);
      await del(s.cashMovements); await del(s.cashSessions); await del(s.clientTransactions);
      await del(s.comptabiliteJournal); await del(s.expenses); await del(s.purchases);
      await del(s.auditLogs); await del(s.supplierOrderPayments); await del(s.supplierPayments);
      await del(s.supplierOrders); await del(s.devis); await del(s.sales);
      await del(s.contactLensPrescriptions); await del(s.prescriptions);
      await del(s.clientInteractions); await del(s.clients); await del(s.products);
      await del(s.suppliers); await del(s.notifications); await del(s.invoiceImports);
      await del(s.reservations);
      await tx.delete(s.frameReservations).where(eq(s.frameReservations.storeId, uId));

      const catalogs = [
        s.brands, s.categories, s.materials, s.colors, s.treatments,
        s.mountingTypes, s.banks, s.insurances, s.shopProfiles, s.settings
      ];
      for (const t of catalogs) await del(t);

      // INSERT — ordre respectant les Foreign Keys (parents avant enfants)
      await ins(s.brands,      (d.brands      || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.categories,  (d.categories  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.materials,   (d.materials   || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.colors,      (d.colors      || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.treatments,  (d.treatments  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.mountingTypes,(d.mountingTypes||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.banks,       (d.banks       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.insurances,  (d.insurances  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.shopProfiles,(d.shopProfiles|| []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.settings,    (d.settings    || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.suppliers,   (d.suppliers   || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.clients,     (d.clients     || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.products,    (d.products    || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.prescriptions,(d.prescriptions||[]).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), clientId: fkInt(r.clientId) })));
      await ins(s.contactLensPrescriptions,(d.contactLensPrescriptions||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.sales,       (d.sales       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), prescriptionId: fk(r.prescriptionId) })));
      await ins(s.saleItems,   (d.saleItems   || []).map((r: any) => ({ ...r, id: migrateIntId(r.id), saleId: fkInt(r.saleId), productId: fkInt(r.productId) })));
      await ins(s.saleLensDetails,(d.saleLensDetails||[]).map((r: any) => ({ ...r, id: migrateIntId(r.id), saleItemId: fkInt(r.saleItemId) })));
      await ins(s.saleContactLensDetails,(d.saleContactLensDetails||[]).map((r: any) => ({ ...r, id: migrateIntId(r.id), saleItemId: fkInt(r.saleItemId) })));
      await ins(s.devis,       (d.devis       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.supplierOrders,(d.supplierOrders||[]).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId) })));
      await ins(s.supplierOrderItems,(d.supplierOrderItems||[]).map((r: any) => ({ ...r, id: migrateIntId(r.id), orderId: fk(r.orderId), productId: fkInt(r.productId) })));
      await ins(s.supplierPayments,(d.supplierPayments||[]).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId), orderId: fk(r.orderId) })));
      await ins(s.goodsReceipts,(d.goodsReceipts||[]).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId) })));
      await ins(s.goodsReceiptItems,(d.goodsReceiptItems||[]).map((r: any) => ({ ...r, id: migrateId(r.id, isLegacy), receiptId: fk(r.receiptId), orderItemId: fkInt(r.orderItemId), productId: fkInt(r.productId) })));
      await ins(s.lensOrders,  (d.lensOrders  || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierOrderId: fk(r.supplierOrderId), prescriptionId: fk(r.prescriptionId), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.stockMovements,(d.stockMovements||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), productId: fkInt(r.productId) })));
      await ins(s.reminders,   (d.reminders   || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), clientId: fkInt(r.clientId) })));
      await ins(s.expenses,    (d.expenses    || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.clientTransactions,(d.clientTransactions||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.cashSessions,(d.cashSessions|| []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.cashMovements,(d.cashMovements||[]).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), sessionId: fk(r.sessionId) })));
      await ins(s.comptabiliteJournal,(d.comptabiliteJournal||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), saleId: fkInt(r.saleId) })));
      await ins(s.purchases,   (d.purchases   || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), supplierId: fk(r.supplierId) })));
      await ins(s.notifications,(d.notifications||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.auditLogs,   (d.auditLogs   || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.reservations,(d.reservations|| []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.frameReservations,(d.frameReservations||[]).map((r: any) => ({ ...r, storeId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.clientInteractions,(d.clientInteractions||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.invoiceImports,(d.invoiceImports||[]).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), supplierId: fk(r.supplierId) })));
    });

    revalidatePath('/dashboard');
    return { success: true };

  } catch (error) {
    console.error('[restoreUserData] ERREUR COMPLÈTE:', error);
    return {
      success: false,
      error: error instanceof Error ? `Restauration échouée : ${error.message}` : 'Restauration échouée : erreur inconnue'
    };
  }
}

// ─────────────────────────────────────────────
// RESET ACCOUNT
// ─────────────────────────────────────────────

export async function resetUserAccount() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Non autorisé.');
    const uId = session.user.id;

    await db.transaction(async (tx) => {
      const del = async (t: Parameters<typeof tx.delete>[0]) =>
        tx.delete(t).where(eq((t as any).userId as Parameters<typeof eq>[0], uId));

      // ─── Step 1: Nullify FK references to avoid circular constraint errors ───
      await tx.update(s.devis).set({ saleId: null }).where(eq(s.devis.userId, uId));
      await tx.update(s.lensOrders).set({ saleId: null }).where(eq(s.lensOrders.userId, uId));

      // ─── Step 2: Delete deepest child tables (no userId — raw SQL) ──────────
      await tx.execute(sql`DELETE FROM sale_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`);
      await tx.execute(sql`DELETE FROM sale_contact_lens_details WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId}))`);
      await tx.execute(sql`DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${uId})`);
      await tx.execute(sql`DELETE FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${uId})`);
      await tx.execute(sql`DELETE FROM goods_receipt_items WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE user_id = ${uId})`);

      // ─── Step 3: frameReservations uses storeId (not userId) ────────────────
      await tx.delete(s.frameReservations).where(eq(s.frameReservations.storeId, uId));

      // ─── Step 4: Delete child tables that reference clients/sales/suppliers ─
      // ⚠️ MUST come BEFORE deleting clients/sales/suppliers
      await del(s.reservations);         // refs clients + sales
      await del(s.clientInteractions);   // refs clients
      await del(s.invoiceImports);       // refs suppliers
      await del(s.notifications);
      await del(s.auditLogs);
      await del(s.reminders);            // refs clients

      // ─── Step 5: Financial & transactional tables ────────────────────────────
      await del(s.cashMovements);        // refs cashSessions
      await del(s.cashSessions);
      await del(s.clientTransactions);   // refs clients
      await del(s.comptabiliteJournal);  // refs sales
      await del(s.expenses);
      await del(s.purchases);

      // ─── Step 6: Supplier-related tables ────────────────────────────────────
      await del(s.supplierCreditAllocations); // refs supplierCredits
      await del(s.supplierCredits);
      await del(s.supplierOrderPayments);     // refs supplierOrders
      await del(s.supplierPayments);

      // ─── Step 7: Goods & lens orders ────────────────────────────────────────
      await del(s.goodsReceipts);
      await del(s.lensOrders);              // refs supplierOrders + prescriptions + clients
      await del(s.stockMovements);

      // ─── Step 8: Core business tables ───────────────────────────────────────
      await del(s.supplierOrders);
      await del(s.devis);                   // refs clients
      await del(s.sales);                   // refs clients + prescriptions
      await del(s.contactLensPrescriptions);// refs clients
      await del(s.prescriptions);           // refs clients

      // ─── Step 9: Parent tables ───────────────────────────────────────────────
      await del(s.suppliers);
      await del(s.clients);                 // ← must come AFTER all child tables ✅
      await del(s.products);

      // ─── Step 10: Settings & catalog tables ─────────────────────────────────
      await del(s.shopProfiles);
      await del(s.settings);
      await del(s.brands);
      await del(s.categories);
      await del(s.materials);
      await del(s.colors);
      await del(s.treatments);
      await del(s.mountingTypes);
      await del(s.banks);
      await del(s.insurances);
    });

    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    console.error('[resetUserAccount] ERREUR:', message);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────
// BACKUP STATS
// ─────────────────────────────────────────────

export async function getBackupStats() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non authentifié');
  const uId = session.user.id;
  const { count } = await import('drizzle-orm');
  const [c, p, sa, sup, ex] = await Promise.all([
    db.select({ n: count() }).from(s.clients).where(eq(s.clients.userId, uId)),
    db.select({ n: count() }).from(s.products).where(eq(s.products.userId, uId)),
    db.select({ n: count() }).from(s.sales).where(eq(s.sales.userId, uId)),
    db.select({ n: count() }).from(s.suppliers).where(eq(s.suppliers.userId, uId)),
    db.select({ n: count() }).from(s.expenses).where(eq(s.expenses.userId, uId)),
  ]);
  return {
    clients: c[0].n,
    products: p[0].n,
    sales: sa[0].n,
    suppliers: sup[0].n,
    expenses: ex[0].n,
    totalRecords: c[0].n + p[0].n + sa[0].n + sup[0].n + ex[0].n,
  };
}
