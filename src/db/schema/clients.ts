import { pgTable, serial, text, timestamp, boolean, decimal, integer, json, jsonb, primaryKey, uuid, index, real, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from 'drizzle-orm';
// ========================================
// 1. CLIENTS TABLE (Déjà migré)
// ========================================
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(), // ⚠️ CRITICAL: Store owner

  // Full name (kept for backwards compatibility)
  fullName: text('full_name').notNull(),

  // 🆕 Separate name fields
  prenom: text('prenom'),
  nom: text('nom'),

  // Contact info
  email: text('email'),
  phone: text('phone'),
  phone2: text('phone_2'), // Optional secondary phone
  address: text('address'),
  city: text('city'),

  // 🆕 Personal info
  gender: text('gender'), // 'Homme' | 'Femme'
  cin: text('cin'), // ID card number
  dateOfBirth: timestamp('date_of_birth'),
  mutuelle: text('mutuelle'), // Insurance/Mutuelle

  notes: text('notes'),

  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).default('5000'), // 🆕 Max credit allowed
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),

  isActive: boolean('is_active').default(true),
  lastVisit: timestamp('last_visit'), // Legacy field preserved for safety

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('clients_user_id_idx').on(table.userId),
  fullNameIdx: index('clients_full_name_idx').on(table.fullName),
  phoneIdx: index('clients_phone_idx').on(table.phone),
  // ✅ GIN index for full-text search (Requires raw SQL usually, or custom in Drizzle)
  // We'll add standard index for now, GIN often needs a database migration script
  idx_clients_fullname_search: index('idx_clients_fullname_search').on(table.fullName),
}));

// ✅ NEW: Client Interactions (Timeline/Chat History)
export const clientInteractions = pgTable('client_interactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),

  type: text('type').notNull().default('note'), // 'note', 'call', 'visit', 'whatsapp'
  content: text('content').notNull(),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('interactions_user_id_idx').on(table.userId),
  clientIdIdx: index('interactions_client_id_idx').on(table.clientId),
}));

// ========================================
// 8. LEGACY PRESCRIPTIONS TABLE
// ========================================
export const prescriptionsLegacy = pgTable('prescriptions_legacy', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),

  // Client reference
  clientId: integer('client_id').references(() => clients.id),

  // Prescription data (store full prescription as JSON)
  prescriptionData: json('prescription_data').notNull(),

  // Metadata
  date: timestamp('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// ========================================
// 9. CONTACT LENS PRESCRIPTIONS TABLE
// ========================================
export const contactLensPrescriptions = pgTable('contact_lens_prescriptions', {
  id: serial('id').primaryKey(),
  firebaseId: text('firebase_id').unique(),
  userId: text('user_id').notNull(),

  // Client reference
  clientId: integer('client_id').references(() => clients.id),

  // Contact lens prescription data (store as JSON)
  prescriptionData: json('prescription_data').notNull(),

  // Metadata
  date: timestamp('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// 📋 Prescriptions (Ordonnances)
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),

  // Ordonnance metadata
  prescriptionDate: timestamp('prescription_date'),
  doctorName: text('doctor_name'),
  imageUrl: text('image_url'),

  // OD (Œil Droit / Right Eye)
  odSph: real('od_sph'),        // Sphere: -20.00 to +20.00
  odCyl: real('od_cyl'),        // Cylinder: -6.00 to +6.00
  odAxis: integer('od_axis'),   // Axis: 0 to 180
  odAdd: real('od_add'),        // Addition: 0 to +4.00
  odPd: real('od_pd'),          // Monocular PD Right
  odHeight: real('od_height'),  // Fitting Height Right

  // OS (Œil Gauche / Left Eye)
  osSph: real('os_sph'),
  osCyl: real('os_cyl'),
  osAxis: integer('os_axis'),
  osAdd: real('os_add'),
  osPd: real('os_pd'),          // Monocular PD Left
  osHeight: real('os_height'), // Fitting Height Left

  // Pupillary Distance (Legacy/Combined)

  pd: real('pd'),               // 50-80 mm typical

  // Notes & Status
  notes: text('notes'),
  status: text('status').default('pending'), // pending | approved | completed

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
