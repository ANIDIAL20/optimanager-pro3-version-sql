
// ========================================
// AUTH.JS TABLES
// ========================================
import { pgTable, text, timestamp, integer, boolean, primaryKey, decimal } from "drizzle-orm/pg-core"
import type { AdapterAccount } from "next-auth/adapters"

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").default("user"),
  
  // Subscription & Plans
  planId: text("plan_id"),
  pricingModel: text("pricing_model"),
  deploymentType: text("deployment_type"),
  subscriptionStatus: text("subscription_status"),
  billingCycle: text("billing_cycle"),
  paymentMode: text("payment_mode"),
  paymentMethod: text("payment_method"),
  autoRenew: boolean("auto_renew").default(false),
  
  subscriptionYear: integer("subscription_year"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionExpiry: timestamp("subscription_expiry"),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  
  isPerpetualLicense: boolean("is_perpetual_license"),
  perpetualLicenseDate: timestamp("perpetual_license_date"),
  
  // Financials
  agreedPrice: decimal("agreed_price", { precision: 10, scale: 2 }),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  salePriceCurrency: text("sale_price_currency"),
  trainingPrice: decimal("training_price", { precision: 10, scale: 2 }),
  setupPrice: decimal("setup_price", { precision: 10, scale: 2 }),
  acquisitionCost: decimal("acquisition_cost", { precision: 10, scale: 2 }),
  acquisitionCostCurrency: text("acquisition_cost_currency"),
  customSubscriptionPrice: decimal("custom_subscription_price", { precision: 10, scale: 2 }),
  customSubscriptionCurrency: text("custom_subscription_currency"),
  financialNotes: text("financial_notes"),
  
  installmentsCount: integer("installments_count"),
  nextInstallmentDate: timestamp("next_installment_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  soldAt: timestamp("sold_at"),

  // Usage Limits
  maxProducts: integer("max_products"),
  maxClients: integer("max_clients"),
  maxSuppliers: integer("max_suppliers"),

  // Security & Tracking
  isActive: boolean("is_active").default(true),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockoutUntil: timestamp("lockout_until"),
  lastLoginAt: timestamp("last_login_at"),
  
  remindersSentCount: integer("reminders_sent_count"),
  lastReminderSentAt: timestamp("last_reminder_sent_at"), // Synced with DB
  // reminderSentAt: timestamp("reminder_sent_at"), // Removing this as DB has last_reminder_sent_at
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
)
