import { pgTable, index, foreignKey, unique, serial, text, numeric, integer, boolean, timestamp, json, uuid, uniqueIndex, real, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const deploymentType = pgEnum("deployment_type", ['SAAS', 'DESKTOP', 'HYBRID'])
export const pricingModel = pgEnum("pricing_model", ['SAAS_FIRST_YEAR', 'SAAS_RENEWAL_PREMIUM', 'SAAS_RENEWAL_BASIC', 'DESKTOP_PERPETUAL', 'CUSTOM'])


export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	reference: text(),
	nom: text().notNull(),
	designation: text(),
	categorie: text(),
	marque: text(),
	fournisseur: text(),
	prixAchat: numeric("prix_achat", { precision: 10, scale:  2 }),
	prixVente: numeric("prix_vente", { precision: 10, scale:  2 }).notNull(),
	prixGros: numeric("prix_gros", { precision: 10, scale:  2 }),
	quantiteStock: integer("quantite_stock").default(0).notNull(),
	seuilAlerte: integer("seuil_alerte").default(5),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	modele: text(),
	couleur: text(),
	details: text(),
	matiereId: integer("matiere_id"),
	couleurId: integer("couleur_id"),
	version: integer().default(0).notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	reservedQuantity: integer("reserved_quantity").default(0).notNull(),
	availableQuantity: integer("available_quantity").default(0).notNull(),
	type: text().default('AUTRE').notNull(),
}, (table) => [
	index("idx_products_not_deleted").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.deletedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_products_user_marque").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.marque.asc().nullsLast().op("text_ops")),
	index("products_nom_idx").using("btree", table.nom.asc().nullsLast().op("text_ops")),
	index("products_reference_idx").using("btree", table.reference.asc().nullsLast().op("text_ops")),
	index("products_search_idx").using("btree", table.marque.asc().nullsLast().op("text_ops"), table.fournisseur.asc().nullsLast().op("text_ops")),
	index("products_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.matiereId],
			foreignColumns: [materials.id],
			name: "products_matiere_id_materials_id_fk"
		}),
	foreignKey({
			columns: [table.couleurId],
			foreignColumns: [colors.id],
			name: "products_couleur_id_colors_id_fk"
		}),
	unique("products_firebase_id_unique").on(table.firebaseId),
]);

export const contactLensPrescriptions = pgTable("contact_lens_prescriptions", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	prescriptionData: json("prescription_data").notNull(),
	date: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "contact_lens_prescriptions_client_id_clients_id_fk"
		}),
	unique("contact_lens_prescriptions_firebase_id_unique").on(table.firebaseId),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	fullName: text("full_name").notNull(),
	phone: text(),
	email: text(),
	address: text(),
	city: text(),
	notes: text(),
	balance: numeric({ precision: 10, scale:  2 }).default('0'),
	totalSpent: numeric("total_spent", { precision: 10, scale:  2 }).default('0'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	lastVisit: timestamp("last_visit", { mode: 'string' }),
	userId: text("user_id").notNull(),
	prenom: text(),
	nom: text(),
	gender: text(),
	cin: text(),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	mutuelle: text(),
	phone2: text("phone_2"),
	creditLimit: numeric("credit_limit", { precision: 10, scale:  2 }).default('5000'),
}, (table) => [
	index("clients_full_name_idx").using("btree", table.fullName.asc().nullsLast().op("text_ops")),
	index("clients_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("clients_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_clients_fullname_search").using("btree", table.fullName.asc().nullsLast().op("text_ops")),
	unique("clients_firebase_id_unique").on(table.firebaseId),
]);

export const settings = pgTable("settings", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	settingKey: text("setting_key").notNull(),
	value: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	unique("settings_firebase_id_unique").on(table.firebaseId),
]);

export const stockMovements = pgTable("stock_movements", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	produitId: text("produit_id"),
	productId: integer("product_id"),
	quantite: integer().notNull(),
	type: text().notNull(),
	ref: text(),
	date: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "stock_movements_product_id_products_id_fk"
		}),
	unique("stock_movements_firebase_id_unique").on(table.firebaseId),
]);

export const devis = pgTable("devis", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	clientName: text("client_name").notNull(),
	clientPhone: text("client_phone"),
	items: json().notNull(),
	totalHt: numeric("total_ht", { precision: 10, scale:  2 }).notNull(),
	totalTtc: numeric("total_ttc", { precision: 10, scale:  2 }).notNull(),
	status: text().default('EN_ATTENTE'),
	saleId: integer("sale_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	validUntil: timestamp("valid_until", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "devis_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "devis_sale_id_sales_id_fk"
		}),
	unique("devis_firebase_id_unique").on(table.firebaseId),
]);

export const supplierOrders = pgTable("supplier_orders", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	fournisseur: text().notNull(),
	items: json(),
	montantTotal: numeric("montant_total", { precision: 10, scale:  2 }).notNull(),
	montantPaye: numeric("montant_paye", { precision: 10, scale:  2 }).default('0'),
	resteAPayer: numeric("reste_a_payer", { precision: 10, scale:  2 }),
	statut: text().default('pending'),
	dateCommande: timestamp("date_commande", { mode: 'string' }),
	dateReception: timestamp("date_reception", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	supplierId: uuid("supplier_id"),
	orderReference: text("order_reference"),
	subTotal: numeric("sub_total", { precision: 10, scale:  2 }),
	tva: numeric({ precision: 10, scale:  2 }),
	discount: numeric({ precision: 10, scale:  2 }),
	shippingCost: numeric("shipping_cost", { precision: 10, scale:  2 }),
	deliveryStatus: text("delivery_status").default('pending'),
	orderNumber: text("order_number"),
	supplierPhone: text("supplier_phone"),
	expectedDelivery: timestamp("expected_delivery", { mode: 'string' }),
	createdBy: text("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_orders_supplier_id_suppliers_id_fk"
		}),
	unique("supplier_orders_firebase_id_unique").on(table.firebaseId),
	unique("supplier_orders_order_number_unique").on(table.orderNumber),
]);

export const sessions = pgTable("sessions", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	fingerprint: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_users_id_fk"
		}).onDelete("cascade"),
]);

export const treatments = pgTable("treatments", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	category: text(),
	price: numeric({ precision: 10, scale:  2 }).default('0'),
	active: boolean().default(true),
});

export const prescriptionsLegacy = pgTable("prescriptions_legacy", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	prescriptionData: json("prescription_data").notNull(),
	date: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "prescriptions_legacy_client_id_clients_id_fk"
		}),
	unique("prescriptions_legacy_firebase_id_unique").on(table.firebaseId),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	password: text(),
	role: text().default('USER').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
	lockoutUntil: timestamp("lockout_until", { mode: 'string' }),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	maxProducts: integer("max_products").default(500).notNull(),
	maxClients: integer("max_clients").default(200).notNull(),
	maxSuppliers: integer("max_suppliers").default(100).notNull(),
	lastPaymentDate: timestamp("last_payment_date", { mode: 'string' }),
	nextPaymentDate: timestamp("next_payment_date", { mode: 'string' }),
	subscriptionExpiry: timestamp("subscription_expiry", { mode: 'string' }),
	paymentMode: text("payment_mode").default('subscription'),
	billingCycle: text("billing_cycle").default('monthly'),
	agreedPrice: numeric("agreed_price", { precision: 10, scale:  2 }),
	amountPaid: numeric("amount_paid", { precision: 10, scale:  2 }).default('0'),
	installmentsCount: integer("installments_count").default(1),
	nextInstallmentDate: timestamp("next_installment_date", { mode: 'string' }),
	trainingPrice: numeric("training_price", { precision: 10, scale:  2 }).default('0'),
	setupPrice: numeric("setup_price", { precision: 10, scale:  2 }).default('0'),
	planId: text("plan_id").default('free'),
	acquisitionCost: numeric("acquisition_cost", { precision: 10, scale:  2 }),
	acquisitionCostCurrency: text("acquisition_cost_currency").default('MAD'),
	salePrice: numeric("sale_price", { precision: 10, scale:  2 }),
	salePriceCurrency: text("sale_price_currency").default('MAD'),
	customSubscriptionPrice: numeric("custom_subscription_price", { precision: 10, scale:  2 }),
	customSubscriptionCurrency: text("custom_subscription_currency").default('MAD'),
	financialNotes: text("financial_notes"),
	soldAt: timestamp("sold_at", { mode: 'string' }),
	paymentMethod: text("payment_method"),
	deploymentType: deploymentType("deployment_type").default('SAAS'),
	pricingModel: pricingModel("pricing_model").default('SAAS_FIRST_YEAR'),
	subscriptionYear: integer("subscription_year").default(1),
	isPerpetualLicense: boolean("is_perpetual_license").default(false),
	perpetualLicenseDate: timestamp("perpetual_license_date", { mode: 'string' }),
	subscriptionStartDate: timestamp("subscription_start_date", { mode: 'string' }),
	subscriptionEndDate: timestamp("subscription_end_date", { mode: 'string' }),
	subscriptionStatus: text("subscription_status").default('ACTIVE'),
	autoRenew: boolean("auto_renew").default(false),
	suspendedAt: timestamp("suspended_at", { mode: 'string' }),
	suspensionReason: text("suspension_reason"),
	lastReminderSentAt: timestamp("last_reminder_sent_at", { mode: 'string' }),
	remindersSentCount: integer("reminders_sent_count").default(0),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const sales = pgTable("sales", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	clientName: text("client_name"),
	clientPhone: text("client_phone"),
	clientMutuelle: text("client_mutuelle"),
	clientAddress: text("client_address"),
	totalHt: numeric("total_ht", { precision: 10, scale:  2 }),
	totalTva: numeric("total_tva", { precision: 10, scale:  2 }),
	totalTtc: numeric("total_ttc", { precision: 10, scale:  2 }).notNull(),
	totalNet: numeric("total_net", { precision: 10, scale:  2 }),
	totalPaye: numeric("total_paye", { precision: 10, scale:  2 }).default('0'),
	resteAPayer: numeric("reste_a_payer", { precision: 10, scale:  2 }),
	status: text().default('impaye'),
	paymentMethod: text("payment_method"),
	type: text(),
	items: json().notNull(),
	paymentHistory: json("payment_history"),
	prescriptionSnapshot: json("prescription_snapshot"),
	notes: text(),
	date: timestamp({ mode: 'string' }),
	lastPaymentDate: timestamp("last_payment_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	saleNumber: text("sale_number"),
}, (table) => [
	index("idx_sales_user_date").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("sales_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("sales_sale_number_idx").using("btree", table.saleNumber.asc().nullsLast().op("text_ops")),
	index("sales_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "sales_client_id_clients_id_fk"
		}),
	unique("sales_firebase_id_unique").on(table.firebaseId),
]);

export const shopProfiles = pgTable("shop_profiles", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	shopName: text("shop_name").notNull(),
	address: text(),
	phone: text(),
	ice: text(),
	rib: text(),
	logoUrl: text("logo_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	rc: text(),
	if: text(),
	patente: text(),
	tvaRate: text("tva_rate"),
	paymentTerms: text("payment_terms"),
	paymentMethods: text("payment_methods"),
	isActive: boolean("is_active").default(true),
});

export const banks = pgTable("banks", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	rib: text(),
	active: boolean().default(true),
});

export const colors = pgTable("colors", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	code: text(),
	active: boolean().default(true),
});

export const suppliers = pgTable("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	address: text(),
	city: text(),
	category: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	ice: text(),
	if: text(),
	rc: text(),
	taxId: text("tax_id"),
	paymentTerms: text("payment_terms").default('30'),
	paymentMethod: text("payment_method"),
	bank: text(),
	rib: text(),
	notes: text(),
	status: text().default('Actif'),
	contactPerson: text("contact_person"),
	creditLimit: numeric("credit_limit", { precision: 10, scale:  2 }).default('0'),
	currentBalance: numeric("current_balance", { precision: 10, scale:  2 }).default('0'),
	rating: text(),
	isActive: boolean("is_active").default(true),
	defaultTaxMode: text("default_tax_mode").default('HT'),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "suppliers_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	active: boolean().default(true),
});

export const brands = pgTable("brands", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	category: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	active: boolean().default(true),
});

export const materials = pgTable("materials", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	category: text(),
	active: boolean().default(true),
});

export const insurances = pgTable("insurances", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	email: text(),
	phone: text(),
	address: text(),
	active: boolean().default(true),
});

export const reminders = pgTable("reminders", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	priority: text().default('normal').notNull(),
	title: text().notNull(),
	message: text(),
	status: text().default('pending').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	relatedId: integer("related_id"),
	relatedType: text("related_type"),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const auditLog = pgTable("audit_log", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id"),
	action: text().notNull(),
	resource: text(),
	success: boolean().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	fingerprint: text(),
	severity: text().default('INFO'),
	metadata: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	supplierId: uuid("supplier_id"),
	supplierName: text("supplier_name").notNull(),
	type: text().notNull(),
	reference: text(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	amountPaid: numeric("amount_paid", { precision: 10, scale:  2 }).default('0'),
	status: text().default('UNPAID').notNull(),
	date: timestamp({ mode: 'string' }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const clientTransactions = pgTable("client_transactions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	type: text().notNull(),
	referenceId: text("reference_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	previousBalance: numeric("previous_balance", { precision: 10, scale:  2 }).notNull(),
	newBalance: numeric("new_balance", { precision: 10, scale:  2 }).notNull(),
	date: timestamp({ mode: 'string' }).defaultNow(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_transactions_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const supplierOrderPayments = pgTable("supplier_order_payments", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	paymentId: uuid("payment_id"),
	orderId: integer("order_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [supplierPayments.id],
			name: "supplier_order_payments_payment_id_supplier_payments_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [supplierOrders.id],
			name: "supplier_order_payments_order_id_supplier_orders_id_fk"
		}).onDelete("cascade"),
]);

export const mountingTypes = pgTable("mounting_types", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	active: boolean().default(true),
});

export const supplierPayments = pgTable("supplier_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	supplierId: uuid("supplier_id"),
	supplierName: text("supplier_name").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	method: text().notNull(),
	reference: text(),
	bank: text(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: text().default('COMPLETED'),
	date: timestamp({ mode: 'string' }).defaultNow(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	paymentNumber: text("payment_number"),
	chequeNumber: text("cheque_number"),
	createdBy: text("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_payments_supplier_id_suppliers_id_fk"
		}),
	unique("supplier_payments_firebase_id_unique").on(table.firebaseId),
	unique("supplier_payments_payment_number_unique").on(table.paymentNumber),
]);

export const supplierOrderItems = pgTable("supplier_order_items", {
	id: serial().primaryKey().notNull(),
	supplierOrderId: integer("supplier_order_id"),
	productType: text("product_type"),
	productName: text("product_name"),
	description: text(),
	lensType: text("lens_type"),
	lensMaterial: text("lens_material"),
	lensIndex: text("lens_index"),
	coating: text(),
	quantity: integer().notNull(),
	receivedQuantity: integer("received_quantity").default(0),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	sphere: text(),
	cylindre: text(),
	axe: text(),
	addition: text(),
	hauteur: text(),
}, (table) => [
	foreignKey({
			columns: [table.supplierOrderId],
			foreignColumns: [supplierOrders.id],
			name: "supplier_order_items_supplier_order_id_supplier_orders_id_fk"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	action: text().notNull(),
	oldValue: json("old_value"),
	newValue: json("new_value"),
	metadata: json(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}),
]);

export const expenses = pgTable("expenses", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	category: text().default('AUTRE').notNull(),
	status: text().default('PAYE'),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	proofUrl: text("proof_url"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	index("expenses_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("expenses_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("expenses_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const invoiceImports = pgTable("invoice_imports", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	supplierId: text("supplier_id"),
	invoiceNumber: text("invoice_number").notNull(),
	invoiceDate: timestamp("invoice_date", { mode: 'string' }),
	status: text().default('completed'),
	totalItems: integer("total_items"),
	revertedAt: timestamp("reverted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_unique_import").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.supplierId.asc().nullsLast().op("text_ops"), table.invoiceNumber.asc().nullsLast().op("timestamp_ops"), table.invoiceDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_user_invoice").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.invoiceNumber.asc().nullsLast().op("text_ops")),
]);

export const prescriptions = pgTable("prescriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	prescriptionDate: timestamp("prescription_date", { mode: 'string' }),
	doctorName: text("doctor_name"),
	imageUrl: text("image_url"),
	odSph: real("od_sph"),
	odCyl: real("od_cyl"),
	odAxis: integer("od_axis"),
	odAdd: real("od_add"),
	osSph: real("os_sph"),
	osCyl: real("os_cyl"),
	osAxis: integer("os_axis"),
	osAdd: real("os_add"),
	pd: real(),
	notes: text(),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "prescriptions_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const reservations = pgTable("reservations", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	clientName: text("client_name").notNull(),
	items: json().notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	depositAmount: numeric("deposit_amount", { precision: 10, scale:  2 }).default('0'),
	remainingAmount: numeric("remaining_amount", { precision: 10, scale:  2 }),
	status: text().default('PENDING'),
	notes: text(),
	saleId: integer("sale_id"),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	index("reservations_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("reservations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("reservations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "reservations_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "reservations_sale_id_sales_id_fk"
		}),
]);

export const clientInteractions = pgTable("client_interactions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	type: text().default('note').notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("interactions_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("interactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_interactions_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const frameReservations = pgTable("frame_reservations", {
	id: serial().primaryKey().notNull(),
	storeId: text("store_id").notNull(),
	clientId: integer("client_id").notNull(),
	clientName: text("client_name").notNull(),
	status: text().default('PENDING').notNull(),
	items: json().notNull(),
	reservationDate: timestamp("reservation_date", { mode: 'string' }).defaultNow().notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	saleId: integer("sale_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [users.id],
			name: "frame_reservations_store_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "frame_reservations_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "frame_reservations_sale_id_sales_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id"),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	priority: text().default('MEDIUM').notNull(),
	relatedEntityType: text("related_entity_type"),
	relatedEntityId: integer("related_entity_id"),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
});

export const lensOrders = pgTable("lens_orders", {
	id: serial().primaryKey().notNull(),
	firebaseId: text("firebase_id"),
	userId: text("user_id").notNull(),
	clientId: integer("client_id"),
	prescriptionId: integer("prescription_id"),
	orderType: text("order_type").notNull(),
	lensType: text("lens_type").notNull(),
	treatment: text(),
	supplierName: text("supplier_name").notNull(),
	rightEye: json("right_eye"),
	leftEye: json("left_eye"),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	quantity: integer().default(1).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	status: text().default('pending').notNull(),
	orderDate: timestamp("order_date", { mode: 'string' }).defaultNow(),
	receivedDate: timestamp("received_date", { mode: 'string' }),
	deliveredDate: timestamp("delivered_date", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	sellingPrice: numeric("selling_price", { precision: 10, scale:  2 }).default('0').notNull(),
	estimatedBuyingPrice: numeric("estimated_buying_price", { precision: 10, scale:  2 }),
	finalBuyingPrice: numeric("final_buying_price", { precision: 10, scale:  2 }),
	supplierInvoiceRef: text("supplier_invoice_ref"),
	estimatedMargin: numeric("estimated_margin", { precision: 10, scale:  2 }),
	finalMargin: numeric("final_margin", { precision: 10, scale:  2 }),
	saleId: integer("sale_id"),
	supplierId: uuid("supplier_id"),
	supplierOrderId: integer("supplier_order_id"),
	sphereR: text("sphere_r"),
	cylindreR: text("cylindre_r"),
	axeR: text("axe_r"),
	additionR: text("addition_r"),
	hauteurR: text("hauteur_r"),
	sphereL: text("sphere_l"),
	cylindreL: text("cylindre_l"),
	axeL: text("axe_l"),
	additionL: text("addition_l"),
	hauteurL: text("hauteur_l"),
	matiere: text(),
	indice: text(),
	ecartPupillaireR: text("ecart_pupillaire_r"),
	ecartPupillaireL: text("ecart_pupillaire_l"),
	diameterR: text("diameter_r"),
	diameterL: text("diameter_l"),
}, (table) => [
	index("idx_lens_orders_pending").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")).where(sql`(status = 'pending'::text)`),
	index("lens_orders_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("lens_orders_sale_id_idx").using("btree", table.saleId.asc().nullsLast().op("int4_ops")),
	index("lens_orders_sphere_l_idx").using("btree", table.sphereL.asc().nullsLast().op("text_ops")),
	index("lens_orders_sphere_r_idx").using("btree", table.sphereR.asc().nullsLast().op("text_ops")),
	index("lens_orders_supplier_id_idx").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")),
	index("lens_orders_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "lens_orders_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "lens_orders_sale_id_sales_id_fk"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "lens_orders_supplier_id_suppliers_id_fk"
		}),
	foreignKey({
			columns: [table.supplierOrderId],
			foreignColumns: [supplierOrders.id],
			name: "lens_orders_supplier_order_id_supplier_orders_id_fk"
		}),
	foreignKey({
			columns: [table.prescriptionId],
			foreignColumns: [prescriptionsLegacy.id],
			name: "lens_orders_prescription_id_prescriptions_legacy_id_fk"
		}),
	unique("lens_orders_firebase_id_unique").on(table.firebaseId),
]);

export const expensesV2 = pgTable("expenses_v2", {
	id: serial().primaryKey().notNull(),
	storeId: text("store_id").notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	type: text().notNull(),
	category: text().notNull(),
	amount: real().notNull(),
	currency: text().default('MAD').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	paymentDate: timestamp("payment_date", { mode: 'string' }),
	period: text(),
	status: text().notNull(),
	provider: text(),
	invoiceNumber: text("invoice_number"),
	attachments: text().array(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_identifier_token_pk"}),
]);

export const accounts = pgTable("accounts", {
	userId: text().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_providerAccountId_pk"}),
]);
