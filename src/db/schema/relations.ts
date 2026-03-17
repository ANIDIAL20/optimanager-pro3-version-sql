import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';


import { clients, clientInteractions, prescriptions, prescriptionsLegacy, contactLensPrescriptions } from './clients';
import { products, invoiceImports, brands, categories, materials, colors, treatments, mountingTypes, banks, insurances } from './products';
import { sales, saleItems, saleLensDetails, saleContactLensDetails, devis, reservations, frameReservations } from './sales';
import { lensOrders } from './lens-orders';
import { users, accounts, sessions, verificationTokens, settings, shopProfiles } from './auth-core';
import { clientTransactions, cashSessions, cashMovements, comptabiliteJournal, purchases } from './finance';
import { expenses } from './expenses';
import { auditLog, auditLogs, stockMovements } from './logs-misc';
import { reminders } from './reminders';
import { suppliers, supplierOrders, supplierPayments, supplierOrderPayments, supplierOrderItems } from './suppliers.schema';
import { supplierCredits, supplierCreditAllocations } from './supplier-credits';
import { goodsReceipts, goodsReceiptItems } from './goods-receipts';
import { notifications } from './notifications';

export const clientInteractionsRelations = relations(clientInteractions, ({ one }) => ({
  client: one(clients, {
    fields: [clientInteractions.clientId],
    references: [clients.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  prescriptionsLegacy: many(prescriptionsLegacy),
  prescriptions: many(prescriptions),
  contactLensPrescriptions: many(contactLensPrescriptions),
  lensOrders: many(lensOrders),
  sales: many(sales),
  devis: many(devis),
  reservations: many(reservations),
}));

export const prescriptionsLegacyRelations = relations(prescriptionsLegacy, ({ one, many }) => ({
  client: one(clients, {
    fields: [prescriptionsLegacy.clientId],
    references: [clients.id],
  }),
  lensOrders: many(lensOrders),
}));

export const contactLensPrescriptionsRelations = relations(contactLensPrescriptions, ({ one }) => ({
  client: one(clients, {
    fields: [contactLensPrescriptions.clientId],
    references: [clients.id],
  }),
}));

export const lensOrdersRelations = relations(lensOrders, ({ one }) => ({
  client: one(clients, {
    fields: [lensOrders.clientId],
    references: [clients.id],
  }),
  prescriptionLegacy: one(prescriptionsLegacy, {
    fields: [lensOrders.prescriptionId],
    references: [prescriptionsLegacy.id],
  }),
  supplier: one(suppliers, {
    fields: [lensOrders.supplierId],
    references: [suppliers.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  orders: many(supplierOrders),
  payments: many(supplierPayments),
  credits: many(supplierCredits),
  receipts: many(goodsReceipts),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  saleItems: many(saleItems),
  lensOrders: many(lensOrders),
}));

export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  lensDetails: many(saleLensDetails),
  contactLensDetails: many(saleContactLensDetails),
}));

export const saleLensDetailsRelations = relations(saleLensDetails, ({ one }) => ({
  saleItem: one(saleItems, {
    fields: [saleLensDetails.saleItemId],
    references: [saleItems.id],
  }),
}));

export const saleContactLensDetailsRelations = relations(saleContactLensDetails, ({ one }) => ({
  saleItem: one(saleItems, {
    fields: [saleContactLensDetails.saleItemId],
    references: [saleItems.id],
  }),
}));

export const devisRelations = relations(devis, ({ one }) => ({
  client: one(clients, {
    fields: [devis.clientId],
    references: [clients.id],
  }),
  sale: one(sales, {
    fields: [devis.saleId],
    references: [sales.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  client: one(clients, {
    fields: [reservations.clientId],
    references: [clients.id],
  }),
  sale: one(sales, {
    fields: [reservations.saleId],
    references: [sales.id],
  }),
}));


export const clientTransactionsRelations = relations(clientTransactions, ({ many, one }) => ({
  client: one(clients, {
    fields: [clientTransactions.clientId],
    references: [clients.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  client: one(clients, {
    fields: [prescriptions.clientId],
    references: [clients.id],
  }),
}));

export const comptabiliteJournalRelations = relations(comptabiliteJournal, ({ one }) => ({
  sale: one(sales, {
    fields: [comptabiliteJournal.saleId],
    references: [sales.id],
  }),
}));

export const frameReservationsRelations = relations(frameReservations, ({ one }) => ({
  client: one(clients, {
    fields: [frameReservations.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [frameReservations.storeId],
    references: [users.id],
  }),
  sale: one(sales, {
    fields: [frameReservations.saleId],
    references: [sales.id],
  }),
}));

// ========================================
// PRODUCTS & STOCK RELATIONS (FIX-V3)
// ========================================

export const productsRelations = relations(products, ({ many, one }) => ({
  saleItems: many(saleItems),
  supplierOrderItems: many(supplierOrderItems),
  stockMovements: many(stockMovements),
  supplier: one(suppliers, {
    fields: [products.fournisseurId],
    references: [suppliers.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));

// ========================================
// SUPPLIER OPERATIONS RELATIONS (CONSOLIDATED)
// ========================================

export const supplierOrderItemsRelations = relations(supplierOrderItems, ({ one }) => ({
  order: one(supplierOrders, {
    fields: [supplierOrderItems.orderId],
    references: [supplierOrders.id],
  }),
  product: one(products, {
    fields: [supplierOrderItems.productId],
    references: [products.id],
  }),
}));

export const supplierOrdersRelations = relations(supplierOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
  allocations: many(supplierOrderPayments),
  items: many(supplierOrderItems),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierPayments.supplierId],
    references: [suppliers.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierPayments.orderId],
    references: [supplierOrders.id],
  }),
  allocations: many(supplierOrderPayments),
}));

export const supplierOrderPaymentsRelations = relations(supplierOrderPayments, ({ one }) => ({
  payment: one(supplierPayments, {
    fields: [supplierOrderPayments.paymentId],
    references: [supplierPayments.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierOrderPayments.orderId],
    references: [supplierOrders.id],
  }),
}));

export const supplierCreditsRelations = relations(supplierCredits, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [supplierCredits.supplierId],
    references: [suppliers.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierCredits.relatedOrderId],
    references: [supplierOrders.id],
  }),
  allocations: many(supplierCreditAllocations),
}));

export const supplierCreditAllocationsRelations = relations(supplierCreditAllocations, ({ one }) => ({
  credit: one(supplierCredits, {
    fields: [supplierCreditAllocations.creditId],
    references: [supplierCredits.id],
  }),
  order: one(supplierOrders, {
    fields: [supplierCreditAllocations.orderId],
    references: [supplierOrders.id],
  }),
}));

// ========================================
// RECEPTION & GOODS RECEIPTS RELATIONS
// ========================================

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [goodsReceipts.supplierId],
    references: [suppliers.id],
  }),
  items: many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  receipt: one(goodsReceipts, {
    fields: [goodsReceiptItems.receiptId],
    references: [goodsReceipts.id],
  }),
  orderItem: one(supplierOrderItems, {
    fields: [goodsReceiptItems.orderItemId],
    references: [supplierOrderItems.id],
  }),
  product: one(products, {
    fields: [goodsReceiptItems.productId],
    references: [products.id],
  }),
}));

// ========================================
// NOTIFICATIONS RELATIONS
// ========================================
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
