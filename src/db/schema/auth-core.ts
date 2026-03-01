import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
// ========================================
// AUTH.JS TABLES (ENHANCED SECURITY)
// ========================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),

  // 🔐 ROLE-BASED ACCESS CONTROL
  role: text("role").$type<"ADMIN" | "USER">()
    .default("USER")
    .notNull(),

  // 🔐 ACCOUNT STATUS
  isActive: boolean("is_active")
    .default(true)
    .notNull(),

  // 🔐 ACCOUNT LOCKOUT (Native DB Anti-Brute Force)
  failedLoginAttempts: integer("failed_login_attempts")
    .default(0)
    .notNull(), // Count of consecutive failures
  lockoutUntil: timestamp("lockout_until"), // Time until unlock

  // 🛡️ QUOTAS & LIMITS
  maxProducts: integer("max_products").default(500).notNull(),
  maxClients: integer("max_clients").default(200).notNull(),
  maxSuppliers: integer("max_suppliers").default(100).notNull(),

  // 💰 SUBSCRIPTION DATES
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  subscriptionExpiry: timestamp("subscription_expiry"),

  // 💳 FINANCIAL TRACKING
  paymentMode: text("payment_mode").$type<"subscription" | "lifetime">().default("subscription"),
  billingCycle: text("billing_cycle").$type<"monthly" | "yearly">().default("monthly"),
  agreedPrice: decimal("agreed_price", { precision: 10, scale: 2 }),
  trainingPrice: decimal("training_price", { precision: 10, scale: 2 }).default("0"),
  setupPrice: decimal("setup_price", { precision: 10, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  installmentsCount: integer("installments_count").default(1),
  nextInstallmentDate: timestamp("next_installment_date"),

  // 📅 ACTIVITY TRACKING
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()).notNull(),
});

export const accounts = pgTable(
  "account",
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
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),

  // 🔍 SESSION SECURITY (New fields)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"), // SHA-256(IP + UA)

  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
});

export const verificationTokens = pgTable(
  "verificationToken",
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
);

// ========================================
// 7. SETTINGS TABLE
// ========================================
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),
  settingKey: text('setting_key').notNull(), // 'shop', 'global_banner', etc.

  // Store as JSON for flexibility
  value: json('value').notNull(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 7b. SHOP PROFILES TABLE
// ========================================
export const shopProfiles = pgTable('shop_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),

  shopName: text('shop_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  ice: text('ice'),
  rib: text('rib'),
  logoUrl: text('logo_url'),
  
  // 🆕 Document Settings
  documentSettings: jsonb('document_settings').notNull().default({}),
  documentSettingsVersion: integer('document_settings_version').notNull().default(1),
  documentSettingsUpdatedAt: timestamp('document_settings_updated_at', { withTimezone: true }),

  // 🎨 Template config (new Canva-like system)
  documentConfig: jsonb('document_config')
    .$type<DocumentTemplateConfig>()
    .default(DEFAULT_TEMPLATE_CONFIG),


  // Missing columns restored to prevent data loss
  paymentMethods: text('payment_methods'),
  rc: text('rc'),
  if: text('if'),
  patente: text('patente'),
  tp: text('tp'),
  inpe: text('inpe'),
  tvaRate: text('tva_rate'),
  paymentTerms: text('payment_terms'),

  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

