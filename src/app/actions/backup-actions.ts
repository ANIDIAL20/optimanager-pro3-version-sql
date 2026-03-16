'use server';
import { neonConfig } from '@neondatabase/serverless';
// Configure WebSocket for Node.js environment (required for transactions)
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  neonConfig.webSocketConstructor = eval('require')('ws');
}


import { db } from '@/db';
import * as s from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql } from 'drizzle-orm';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ─────────────────────────────────────────────
// HELPER: sanitize dates in backup JSON
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// HELPER: convert snake_case keys to camelCase
// Raw SQL exports return snake_case, Drizzle expects camelCase
// ─────────────────────────────────────────────
function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// ─────────────────────────────────────────────
// HELPER: ID migration helpers (local per call)
// ─────────────────────────────────────────────
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
  const fk  = (id: unknown) => id ? (idMap.get(String(id)) || null) : null;
  const fkInt = (id: unknown) => id ? Number(id) : null;

  return { migrateId, migrateIntId, fk, fkInt };
}

// ─────────────────────────────────────────────────────────────────────────────
// purgeAllUserData
// Deletes ALL rows belonging to userId across every table.
//
// RULES:
//  - ONLY parameterized sql`` template literals — no drizzle .delete(), no sql.raw()
//  - Table names are the ACTUAL PostgreSQL names from pgTable('...')
//  - Order is FK-safe: children before parents
//
// ACTUAL TABLE NAMES (verified from schema files):
//  expenses.ts      → pgTable('expenses_v2', ...)      ← NOT 'expenses'
//  audit-log.schema → pgTable('audit_logs_v2', ...)
//  logs-misc.ts     → pgTable('audit_logs', ...)  and pgTable('audit_log', ...)
//  frame_reservations uses store_id (not user_id)
// ─────────────────────────────────────────────────────────────────────────────
async function purgeAllUserData(tx: any, userId: string) {

  // Pre-check: get all tables that actually exist in the DB
  const existingTablesResult = await tx.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const existingTables = new Set(
    existingTablesResult.rows.map((r: any) => r.table_name)
  );

  // Helper: only execute DELETE if the table exists in the DB
  const safeDel = async (tableName: string, query: ReturnType<typeof sql>) => {
    if (!existingTables.has(tableName)) return;
    await tx.execute(query);
  };

  // Helper for UPDATE (same pattern)
  const safeUpd = async (tableName: string, query: ReturnType<typeof sql>) => {
    if (!existingTables.has(tableName)) return;
    await tx.execute(query);
  };

  // ── Step 0: SET NULL on circular FKs to allow deletion of parent rows ────────
  await safeUpd('devis',              sql`UPDATE devis              SET sale_id = NULL WHERE user_id = ${userId}`);
  await safeUpd('lens_orders',        sql`UPDATE lens_orders        SET sale_id = NULL WHERE user_id = ${userId}`);
  await safeUpd('reservations',       sql`UPDATE reservations       SET sale_id = NULL WHERE user_id = ${userId}`);
  await safeUpd('frame_reservations', sql`UPDATE frame_reservations SET sale_id = NULL WHERE store_id = ${userId}`);

  // ── Step 1: Leaf rows with no user_id (require JOIN to find owner) ────────────
  await safeDel('sale_lens_details', sql`
    DELETE FROM sale_lens_details
    WHERE sale_item_id IN (
      SELECT si.id FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.user_id = ${userId}
    )`);

  await safeDel('sale_contact_lens_details', sql`
    DELETE FROM sale_contact_lens_details
    WHERE sale_item_id IN (
      SELECT si.id FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.user_id = ${userId}
    )`);

  await safeDel('sale_items', sql`
    DELETE FROM sale_items
    WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ${userId})`);

  await safeDel('goods_receipt_items', sql`
    DELETE FROM goods_receipt_items
    WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE user_id = ${userId})`);

  await safeDel('supplier_order_items', sql`
    DELETE FROM supplier_order_items
    WHERE order_id IN (SELECT id FROM supplier_orders WHERE user_id = ${userId})`);

  // ── Step 2: frame_reservations (uses store_id, not user_id) ──────────────────
  await safeDel('frame_reservations', sql`DELETE FROM frame_reservations WHERE store_id = ${userId}`);

  // ── Step 3: Child tables referencing clients / sales / suppliers ──────────────
  await safeDel('client_interactions', sql`DELETE FROM client_interactions WHERE user_id = ${userId}`);
  await safeDel('reservations',        sql`DELETE FROM reservations       WHERE user_id = ${userId}`);
  await safeDel('invoice_imports',     sql`DELETE FROM invoice_imports    WHERE user_id = ${userId}`);
  await safeDel('reminders',           sql`DELETE FROM reminders          WHERE user_id = ${userId}`);

  // ── Step 4: Audit and notification tables ────────────────────────────────────
  await safeDel('notifications', sql`DELETE FROM notifications WHERE user_id = ${userId}`);
  await safeDel('audit_logs',    sql`DELETE FROM audit_logs    WHERE user_id = ${userId}`);
  await safeDel('audit_logs_v2', sql`DELETE FROM audit_logs_v2 WHERE user_id = ${userId}`);
  await safeDel('audit_log',     sql`DELETE FROM audit_log     WHERE user_id = ${userId}`);

  // ── Step 5: Financial tables ──────────────────────────────────────────────────
  await safeDel('cash_movements',       sql`DELETE FROM cash_movements       WHERE user_id = ${userId}`);
  await safeDel('cash_sessions',        sql`DELETE FROM cash_sessions        WHERE user_id = ${userId}`);
  await safeDel('client_transactions',  sql`DELETE FROM client_transactions  WHERE user_id = ${userId}`);
  await safeDel('comptabilite_journal', sql`DELETE FROM comptabilite_journal WHERE user_id = ${userId}`);
  await safeDel('expenses_v2',          sql`DELETE FROM expenses_v2          WHERE user_id = ${userId}`);
  await safeDel('purchases',            sql`DELETE FROM purchases            WHERE user_id = ${userId}`);

  // ── Step 6: Supplier credit chain ────────────────────────────────────────────
  await safeDel('supplier_credit_allocations', sql`DELETE FROM supplier_credit_allocations WHERE user_id = ${userId}`);
  await safeDel('supplier_credits',            sql`DELETE FROM supplier_credits            WHERE user_id = ${userId}`);
  await safeDel('supplier_order_payments',     sql`DELETE FROM supplier_order_payments     WHERE user_id = ${userId}`);

  // ── Step 7: Goods receipts and lens orders ────────────────────────────────────
  await safeDel('goods_receipts', sql`DELETE FROM goods_receipts WHERE user_id = ${userId}`);
  await safeDel('lens_orders',    sql`DELETE FROM lens_orders    WHERE user_id = ${userId}`);

  // ── Step 8: Stock movements ───────────────────────────────────────────────────
  await safeDel('stock_movements', sql`DELETE FROM stock_movements WHERE user_id = ${userId}`);

  // ── Step 9: Supplier payments and orders ──────────────────────────────────────
  await safeDel('supplier_payments', sql`DELETE FROM supplier_payments WHERE user_id = ${userId}`);
  await safeDel('supplier_orders',   sql`DELETE FROM supplier_orders   WHERE user_id = ${userId}`);

  // ── Step 10: Core sales and prescriptions ─────────────────────────────────────
  await safeDel('devis', sql`DELETE FROM devis WHERE user_id = ${userId}`);
  await safeDel('sales', sql`DELETE FROM sales WHERE user_id = ${userId}`);
  await safeDel('contact_lens_prescriptions', sql`DELETE FROM contact_lens_prescriptions WHERE user_id = ${userId}`);
  await safeDel('prescriptions',              sql`DELETE FROM prescriptions              WHERE user_id = ${userId}`);
  await safeDel('prescriptions_legacy',       sql`DELETE FROM prescriptions_legacy       WHERE user_id = ${userId}`);

  // ── Step 11: Parent tables ────────────────────────────────────────────────────
  await safeDel('suppliers', sql`DELETE FROM suppliers WHERE user_id = ${userId}`);
  await safeDel('clients',   sql`DELETE FROM clients   WHERE user_id = ${userId}`);
  await safeDel('products',  sql`DELETE FROM products  WHERE user_id = ${userId}`);

  // ── Step 12: Settings and catalogues ─────────────────────────────────────────
  await safeDel('shop_profiles',  sql`DELETE FROM shop_profiles  WHERE user_id = ${userId}`);
  await safeDel('settings',       sql`DELETE FROM settings       WHERE user_id = ${userId}`);
  await safeDel('brands',         sql`DELETE FROM brands         WHERE user_id = ${userId}`);
  await safeDel('categories',     sql`DELETE FROM categories     WHERE user_id = ${userId}`);
  await safeDel('materials',      sql`DELETE FROM materials      WHERE user_id = ${userId}`);
  await safeDel('colors',         sql`DELETE FROM colors         WHERE user_id = ${userId}`);
  await safeDel('treatments',     sql`DELETE FROM treatments     WHERE user_id = ${userId}`);
  await safeDel('mounting_types', sql`DELETE FROM mounting_types WHERE user_id = ${userId}`);
  await safeDel('banks',          sql`DELETE FROM banks          WHERE user_id = ${userId}`);
  await safeDel('insurances',     sql`DELETE FROM insurances     WHERE user_id = ${userId}`);
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
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
      'auditLogs', 'reservations', 'notifications', 'clientInteractions', 'invoiceImports',
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

    // frame_reservations uses storeId
    data.frameReservations = await db
      .select()
      .from(s.frameReservations)
      .where(eq(s.frameReservations.storeId, uId));

    // Relational tables without userId — fetch via JOIN
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
    console.error('[exportUserData] ERREUR:', error);
    return {
      success: false,
      error: error instanceof Error ? `Export échoué : ${error.message}` : 'Export échoué : erreur inconnue',
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
    const { migrateId, migrateIntId, fk, fkInt } = createIdHelpers();

    await db.transaction(async (tx) => {

      // ── DELETE: single call, correct FK order, correct table names ─────────
      await purgeAllUserData(tx, uId);

      // ── INSERT: parents before children ────────────────────────────────────
      const ins = async (t: Parameters<typeof tx.insert>[0], rows: any[]) => {
        if (!rows?.length) return;
        for (let i = 0; i < rows.length; i += 100) {
          await tx.insert(t).values(rows.slice(i, i + 100) as any).onConflictDoNothing();
        }
      };

      await ins(s.brands,         (d.brands         || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.categories,     (d.categories     || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.materials,      (d.materials      || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.colors,         (d.colors         || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.treatments,     (d.treatments     || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.mountingTypes,  (d.mountingTypes  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.banks,          (d.banks          || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.insurances,     (d.insurances     || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.shopProfiles,   (d.shopProfiles   || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.settings,       (d.settings       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.suppliers,      (d.suppliers      || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.clients,        (d.clients        || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.products,       (d.products       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.prescriptions,  (d.prescriptions  || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), clientId: fkInt(r.clientId) })));
      await ins(s.contactLensPrescriptions, (d.contactLensPrescriptions || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.sales,          (d.sales          || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), prescriptionId: fk(r.prescriptionId) })));
      // Raw-SQL-exported tables: convert snake_case keys to camelCase first
      await ins(s.saleItems,      (d.saleItems      || []).map((r: any) => { const c = snakeToCamel(r); return { ...c, id: migrateIntId(c.id), saleId: fkInt(c.saleId), productId: fkInt(c.productId) }; }));
      await ins(s.saleLensDetails,(d.saleLensDetails || []).map((r: any) => { const c = snakeToCamel(r); return { ...c, id: migrateIntId(c.id), saleItemId: fkInt(c.saleItemId) }; }));
      await ins(s.saleContactLensDetails, (d.saleContactLensDetails || []).map((r: any) => { const c = snakeToCamel(r); return { ...c, id: migrateIntId(c.id), saleItemId: fkInt(c.saleItemId) }; }));
      await ins(s.devis,          (d.devis          || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.supplierOrders, (d.supplierOrders || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId) })));
      await ins(s.supplierOrderItems, (d.supplierOrderItems || []).map((r: any) => { const c = snakeToCamel(r); return { ...c, id: migrateIntId(c.id), orderId: fk(c.orderId), productId: fkInt(c.productId) }; }));
      await ins(s.supplierPayments,   (d.supplierPayments   || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId), orderId: fk(r.orderId) })));
      await ins(s.goodsReceipts,  (d.goodsReceipts  || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierId: fk(r.supplierId) })));
      await ins(s.goodsReceiptItems, (d.goodsReceiptItems || []).map((r: any) => { const c = snakeToCamel(r); return { ...c, id: migrateId(c.id, isLegacy), receiptId: fk(c.receiptId), orderItemId: fkInt(c.orderItemId), productId: fkInt(c.productId) }; }));
      await ins(s.lensOrders,     (d.lensOrders     || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), supplierOrderId: fk(r.supplierOrderId), prescriptionId: fk(r.prescriptionId), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.stockMovements, (d.stockMovements || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), productId: fkInt(r.productId) })));
      await ins(s.reminders,      (d.reminders      || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.expenses,       (d.expenses       || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.clientTransactions, (d.clientTransactions || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.cashSessions,   (d.cashSessions   || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.cashMovements,  (d.cashMovements  || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy), sessionId: fk(r.sessionId) })));
      await ins(s.comptabiliteJournal, (d.comptabiliteJournal || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), saleId: fkInt(r.saleId) })));
      await ins(s.purchases,      (d.purchases      || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), supplierId: fk(r.supplierId) })));
      await ins(s.notifications,  (d.notifications  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
      await ins(s.auditLogs,      (d.auditLogs      || []).map((r: any) => ({ ...r, userId: uId, id: migrateId(r.id, isLegacy) })));
      await ins(s.reservations,   (d.reservations   || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.frameReservations, (d.frameReservations || []).map((r: any) => ({ ...r, storeId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId), saleId: fkInt(r.saleId) })));
      await ins(s.clientInteractions, (d.clientInteractions || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id), clientId: fkInt(r.clientId) })));
      await ins(s.invoiceImports, (d.invoiceImports  || []).map((r: any) => ({ ...r, userId: uId, id: migrateIntId(r.id) })));
    });

    revalidatePath('/dashboard');
    return { success: true };

  } catch (error) {
    console.error('[restoreUserData] ERREUR:', error);
    return {
      success: false,
      error: error instanceof Error ? `Restauration échouée : ${error.message}` : 'Restauration échouée : erreur inconnue',
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
      await purgeAllUserData(tx, uId);
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
    clients:      Number(c[0].n),
    products:     Number(p[0].n),
    sales:        Number(sa[0].n),
    suppliers:    Number(sup[0].n),
    expenses:     Number(ex[0].n),
    totalRecords: Number(c[0].n) + Number(p[0].n) + Number(sa[0].n) + Number(sup[0].n) + Number(ex[0].n),
  };
}
