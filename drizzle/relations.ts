import { relations } from "drizzle-orm/relations";
import { clients, contactLensPrescriptions, materials, products, colors, stockMovements, devis, sales, suppliers, supplierOrders, users, sessions, prescriptions, clientTransactions, supplierOrderItems, supplierPayments, supplierOrderPayments, auditLogs, lensOrders, accounts } from "./schema";

export const contactLensPrescriptionsRelations = relations(contactLensPrescriptions, ({one}) => ({
	client: one(clients, {
		fields: [contactLensPrescriptions.clientId],
		references: [clients.id]
	}),
}));

export const clientsRelations = relations(clients, ({many}) => ({
	contactLensPrescriptions: many(contactLensPrescriptions),
	devis: many(devis),
	prescriptions: many(prescriptions),
	sales: many(sales),
	clientTransactions: many(clientTransactions),
	lensOrders: many(lensOrders),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	material: one(materials, {
		fields: [products.matiereId],
		references: [materials.id]
	}),
	color: one(colors, {
		fields: [products.couleurId],
		references: [colors.id]
	}),
	stockMovements: many(stockMovements),
}));

export const materialsRelations = relations(materials, ({many}) => ({
	products: many(products),
}));

export const colorsRelations = relations(colors, ({many}) => ({
	products: many(products),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
	product: one(products, {
		fields: [stockMovements.productId],
		references: [products.id]
	}),
}));

export const devisRelations = relations(devis, ({one}) => ({
	client: one(clients, {
		fields: [devis.clientId],
		references: [clients.id]
	}),
	sale: one(sales, {
		fields: [devis.saleId],
		references: [sales.id]
	}),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	devis: many(devis),
	client: one(clients, {
		fields: [sales.clientId],
		references: [clients.id]
	}),
	lensOrders: many(lensOrders),
}));

export const supplierOrdersRelations = relations(supplierOrders, ({one, many}) => ({
	supplier: one(suppliers, {
		fields: [supplierOrders.supplierId],
		references: [suppliers.id]
	}),
	supplierOrderItems: many(supplierOrderItems),
	supplierOrderPayments: many(supplierOrderPayments),
	lensOrders: many(lensOrders),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	supplierOrders: many(supplierOrders),
	user: one(users, {
		fields: [suppliers.userId],
		references: [users.id]
	}),
	supplierPayments: many(supplierPayments),
	lensOrders: many(lensOrders),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	suppliers: many(suppliers),
	auditLogs: many(auditLogs),
	accounts: many(accounts),
}));

export const prescriptionsRelations = relations(prescriptions, ({one, many}) => ({
	client: one(clients, {
		fields: [prescriptions.clientId],
		references: [clients.id]
	}),
	lensOrders: many(lensOrders),
}));

export const clientTransactionsRelations = relations(clientTransactions, ({one}) => ({
	client: one(clients, {
		fields: [clientTransactions.clientId],
		references: [clients.id]
	}),
}));

export const supplierOrderItemsRelations = relations(supplierOrderItems, ({one}) => ({
	supplierOrder: one(supplierOrders, {
		fields: [supplierOrderItems.supplierOrderId],
		references: [supplierOrders.id]
	}),
}));

export const supplierOrderPaymentsRelations = relations(supplierOrderPayments, ({one}) => ({
	supplierPayment: one(supplierPayments, {
		fields: [supplierOrderPayments.paymentId],
		references: [supplierPayments.id]
	}),
	supplierOrder: one(supplierOrders, {
		fields: [supplierOrderPayments.orderId],
		references: [supplierOrders.id]
	}),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({one, many}) => ({
	supplierOrderPayments: many(supplierOrderPayments),
	supplier: one(suppliers, {
		fields: [supplierPayments.supplierId],
		references: [suppliers.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const lensOrdersRelations = relations(lensOrders, ({one}) => ({
	client: one(clients, {
		fields: [lensOrders.clientId],
		references: [clients.id]
	}),
	prescription: one(prescriptions, {
		fields: [lensOrders.prescriptionId],
		references: [prescriptions.id]
	}),
	sale: one(sales, {
		fields: [lensOrders.saleId],
		references: [sales.id]
	}),
	supplier: one(suppliers, {
		fields: [lensOrders.supplierId],
		references: [suppliers.id]
	}),
	supplierOrder: one(supplierOrders, {
		fields: [lensOrders.supplierOrderId],
		references: [supplierOrders.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));