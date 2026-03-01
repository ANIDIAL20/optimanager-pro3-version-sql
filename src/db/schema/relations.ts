import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';


import { clients, clientInteractions, prescriptions, prescriptionsLegacy, contactLensPrescriptions } from './clients';
import { products, invoiceImports, brands, categories, materials, colors, treatments, mountingTypes, banks, insurances } from './products';
import { sales, saleItems, saleLensDetails, saleContactLensDetails, devis, reservations, frameReservations } from './sales';
import { lensOrders, supplierOrderItems } from './lens-orders';
import { users, accounts, sessions, verificationTokens, settings, shopProfiles } from './auth-core';
import { clientTransactions, expenses, cashSessions, cashMovements, comptabiliteJournal, purchases } from './finance';
import { auditLog, auditLogs, stockMovements, reminders } from './logs-misc';
import { suppliers, supplierOrders, supplierPayments, supplierOrderPayments } from './suppliers.schema';
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


export const clientTransactionsRelations = relations(clientTransactions, ({ one }) => ({
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
// NOTIFICATIONS RELATIONS
// ========================================
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
