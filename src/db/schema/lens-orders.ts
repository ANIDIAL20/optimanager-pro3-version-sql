import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
import { clients, prescriptionsLegacy } from './clients';
import { sales } from './sales';
import { suppliers, supplierOrders } from './suppliers.schema';
// ========================================
// 10. LENS ORDERS TABLE
// ========================================
export const lensOrders = pgTable('lens_orders', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),

  // References
  clientId: integer('client_id').references(() => clients.id),
  prescriptionId: integer('prescription_id').references(() => prescriptionsLegacy.id),
  saleId: integer('sale_id').references(() => sales.id), // Link to the sale when billed

  // Order details
  orderType: text('order_type').notNull(), // 'progressive', 'bifocal', 'unifocal', 'contact'
  lensType: text('lens_type').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierOrderId: uuid('supplier_order_id').references(() => supplierOrders.id),
  treatment: text('treatment'),
  supplierName: text('supplier_name').notNull(),

  // Explicit Prescription Details (Replacing JSON)
  sphereR: text('sphere_r'),
  cylindreR: text('cylindre_r'),
  axeR: text('axe_r'),
  additionR: text('addition_r'),
  hauteurR: text('hauteur_r'),

  sphereL: text('sphere_l'),
  cylindreL: text('cylindre_l'),
  axeL: text('axe_l'),
  additionL: text('addition_l'),
  hauteurL: text('hauteur_l'),

  ecartPupillaireR: text('ecart_pupillaire_r'),
  ecartPupillaireL: text('ecart_pupillaire_l'),
  diameterR: text('diameter_r'),
  diameterL: text('diameter_l'),

  // Keep legacy JSON fields to prevent data loss 🛡️
  rightEye: json('right_eye'),
  leftEye: json('left_eye'),

  matiere: text('matiere'),
  indice: text('indice'),
  pont: text('pont'),
  branches: text('branches'),

  // ========================================
  // PROFESSIONAL PRICING WORKFLOW
  // ========================================

  // Prix de Vente Client (fixé à la commande - OBLIGATOIRE)
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull().default('0'),

  // Prix d'Achat Estimé (depuis catalogue - optionnel à la commande)
  estimatedBuyingPrice: decimal('estimated_buying_price', { precision: 10, scale: 2 }),

  // Prix d'Achat Final (validé à la réception du BL)
  finalBuyingPrice: decimal('final_buying_price', { precision: 10, scale: 2 }),

  // Référence BL/Facture Fournisseur
  supplierInvoiceRef: text('supplier_invoice_ref'),
  deliveryNoteRef: text('delivery_note_ref'),

  // Marges calculées
  estimatedMargin: decimal('estimated_margin', { precision: 10, scale: 2 }), // sellingPrice - estimatedBuyingPrice
  finalMargin: decimal('final_margin', { precision: 10, scale: 2 }),         // sellingPrice - finalBuyingPrice

  // Legacy pricing (kept for backwards compatibility)
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),

  // Status tracking
  status: text('status').default('pending').notNull(), // 'pending', 'ordered', 'received', 'delivered'
  orderDate: timestamp('order_date').defaultNow(),
  receivedDate: timestamp('received_date'),
  deliveredDate: timestamp('delivered_date'),

  // Additional info
  notes: text('notes'),

  // 💰 Avance (paiement partiel reçu à la commande)
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('lens_orders_user_id_idx').on(table.userId),
  clientIdIdx: index('lens_orders_client_id_idx').on(table.clientId),
  saleIdIdx: index('lens_orders_sale_id_idx').on(table.saleId),
  supplierIdIdx: index('lens_orders_supplier_id_idx').on(table.supplierId),
  sphereRIdx: index('lens_orders_sphere_r_idx').on(table.sphereR),
  sphereLIdx: index('lens_orders_sphere_l_idx').on(table.sphereL),
  // ✅ Partial index for pending orders
  idx_lens_orders_pending: index('idx_lens_orders_pending')
    .on(table.userId, table.createdAt)
    .where(sql`status = 'pending'`),
  // ⚡ Optimization: Dedicated index for Dashboard Ready Lenses widget
  idx_lens_orders_ready_for_delivery: index('idx_lens_orders_ready_for_delivery')
    .on(table.userId, table.updatedAt)
    .where(sql`status = 'received' AND sale_id IS NULL`),
}));

// Modular schemas used: ./schema/suppliers.schema.ts, ./schema/supplier-orders.schema.ts, ./schema/supplier-payments.schema.ts
