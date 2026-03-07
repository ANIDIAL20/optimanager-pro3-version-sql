CREATE TABLE "client_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" integer,
	"type" text DEFAULT 'note' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prescriptions_legacy" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"client_id" integer,
	"prescription_data" json NOT NULL,
	"date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "prescriptions_legacy_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"rib" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "insurances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "invoice_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"supplier_id" text,
	"invoice_number" text NOT NULL,
	"invoice_date" timestamp,
	"status" text DEFAULT 'completed',
	"total_items" integer,
	"reverted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mounting_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"price" numeric(10, 2) DEFAULT '0',
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "frame_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"client_id" integer NOT NULL,
	"client_name" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"items" json NOT NULL,
	"reservation_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"remaining_amount" numeric(10, 2) DEFAULT '0',
	"completed_at" timestamp,
	"sale_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" integer,
	"client_name" text NOT NULL,
	"items" json NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"remaining_amount" numeric(10, 2),
	"status" text DEFAULT 'PENDING',
	"notes" text,
	"sale_id" integer,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sale_contact_lens_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_item_id" integer NOT NULL,
	"eye" text NOT NULL,
	"power" text,
	"base_curve" text,
	"diameter" text,
	"duration" text,
	"cylinder" text,
	"axis" text,
	"addition" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer,
	"brand" text,
	"category" text,
	"product_type" text,
	"label" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_price_ht" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit_price_tva" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit_price_ttc" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tva_rate" numeric(5, 2) DEFAULT '20' NOT NULL,
	"line_total_ht" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total_tva" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total_ttc" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_discount_line" boolean DEFAULT false,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_lens_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_item_id" integer NOT NULL,
	"eye" text NOT NULL,
	"sphere" text,
	"cylinder" text,
	"axis" text,
	"addition" text,
	"index" text,
	"diameter" text,
	"material" text,
	"treatment" text,
	"lens_type" text,
	"base_curve" text,
	"prism" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"shop_name" text NOT NULL,
	"address" text,
	"phone" text,
	"ice" text,
	"rib" text,
	"logo_url" text,
	"document_settings" jsonb DEFAULT '{"templateId":"classic","primaryColor":"#1e293b","secondaryColor":"#64748b","headerLayout":"logo-left","fontSize":"medium","showLogo":true,"showAddress":true,"showPhone":true,"showEmail":true,"showICE":true,"showRIB":false,"showSignatureBox":true,"showStamp":false,"footerText":""}'::jsonb NOT NULL,
	"document_settings_version" integer DEFAULT 1 NOT NULL,
	"document_settings_updated_at" timestamp with time zone,
	"payment_methods" text,
	"rc" text,
	"if" text,
	"patente" text,
	"tp" text,
	"inpe" text,
	"tva_rate" text,
	"payment_terms" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"opening_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"closing_balance" numeric(10, 2),
	"expected_balance" numeric(10, 2),
	"difference" numeric(10, 2),
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"closed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" integer,
	"type" text NOT NULL,
	"reference_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"previous_balance" numeric(10, 2) NOT NULL,
	"new_balance" numeric(10, 2) NOT NULL,
	"date" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comptabilite_journal" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"sale_id" integer,
	"montant_ht" numeric(10, 2) NOT NULL,
	"tva" numeric(10, 2) NOT NULL,
	"montant_ttc" numeric(10, 2) NOT NULL,
	"statut" text DEFAULT 'BROUILLON',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"supplier_id" uuid,
	"supplier_name" text NOT NULL,
	"type" text NOT NULL,
	"reference" text,
	"total_amount" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"date" timestamp,
	"due_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource" text,
	"success" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"fingerprint" text,
	"severity" text DEFAULT 'INFO',
	"metadata" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"old_value" json,
	"new_value" json,
	"metadata" json,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"reference" varchar(100),
	"label" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"total" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"payment_id" uuid,
	"order_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_id" uuid,
	"firebase_id" text,
	"supplier_name" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"bank" text,
	"due_date" timestamp with time zone,
	"status" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"payment_number" text,
	"cheque_number" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"related_entity_type" text,
	"related_entity_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "expenses_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'MAD' NOT NULL,
	"due_date" timestamp,
	"payment_date" timestamp,
	"period" text,
	"status" text NOT NULL,
	"provider" text,
	"invoice_number" text,
	"attachments" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"fingerprint" text,
	"created_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'user',
	"plan_id" text,
	"pricing_model" text,
	"deployment_type" text,
	"subscription_status" text,
	"billing_cycle" text,
	"payment_mode" text,
	"payment_method" text,
	"auto_renew" boolean DEFAULT false,
	"subscription_year" integer,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"subscription_expiry" timestamp,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"is_perpetual_license" boolean,
	"perpetual_license_date" timestamp,
	"agreed_price" numeric(10, 2),
	"amount_paid" numeric(10, 2),
	"sale_price" numeric(10, 2),
	"sale_price_currency" text,
	"training_price" numeric(10, 2),
	"setup_price" numeric(10, 2),
	"acquisition_cost" numeric(10, 2),
	"acquisition_cost_currency" text,
	"custom_subscription_price" numeric(10, 2),
	"custom_subscription_currency" text,
	"financial_notes" text,
	"installments_count" integer,
	"next_installment_date" timestamp,
	"last_payment_date" timestamp,
	"next_payment_date" timestamp,
	"sold_at" timestamp,
	"max_products" integer,
	"max_clients" integer,
	"max_suppliers" integer,
	"is_active" boolean DEFAULT true,
	"failed_login_attempts" integer DEFAULT 0,
	"lockout_until" timestamp,
	"last_login_at" timestamp,
	"reminders_sent_count" integer,
	"last_reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_firebase_id_unique";--> statement-breakpoint
ALTER TABLE "supplier_orders" DROP CONSTRAINT "supplier_orders_firebase_id_unique";--> statement-breakpoint
ALTER TABLE "lens_orders" DROP CONSTRAINT "lens_orders_prescription_id_prescriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "prescriptions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "prescriptions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "prescriptions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "quantite_stock" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "type" SET DEFAULT 'VENTE';--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "fournisseur" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "items" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "montant_total" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "montant_total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "montant_paye" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "montant_paye" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "reste_a_payer" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "statut" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "date_commande" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "phone_2" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "credit_limit" numeric(10, 2) DEFAULT '5000';--> statement-breakpoint
ALTER TABLE "devis" ADD COLUMN "template_version_used" integer;--> statement-breakpoint
ALTER TABLE "devis" ADD COLUMN "template_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "devis" ADD COLUMN "document_settings_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "sale_id" integer;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "supplier_order_id" uuid;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "sphere_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "cylindre_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "axe_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "addition_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "hauteur_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "sphere_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "cylindre_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "axe_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "addition_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "hauteur_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "ecart_pupillaire_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "ecart_pupillaire_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "diameter_r" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "diameter_l" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "matiere" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "indice" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "pont" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "branches" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "selling_price" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "estimated_buying_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "final_buying_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "supplier_invoice_ref" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "delivery_note_ref" text;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "estimated_margin" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "final_margin" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "lens_orders" ADD COLUMN "amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescription_date" timestamp;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "doctor_name" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_sph" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_cyl" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_axis" integer;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_add" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_pd" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "od_height" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_sph" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_cyl" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_axis" integer;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_add" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_pd" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "os_height" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "pd" real;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "modele" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "couleur" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "matiere_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "couleur_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_tva" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_type" text DEFAULT 'TTC';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_ht" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_tva" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_ttc" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "exemption_note" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "available_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type" text DEFAULT 'AUTRE' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text DEFAULT 'OPTIQUE';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'accessory';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tva_rate" numeric(5, 2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_medical" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_stock_managed" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "related_id" varchar(36);--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "related_type" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "transaction_number" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivery_status" text DEFAULT 'en_attente';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "is_declared" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "is_official_invoice" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "comptabilite_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "template_version_used" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "template_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "document_settings_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "fingerprint" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "last_activity_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "order_reference" text;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "sub_total" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "tva" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "discount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "shipping_cost" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "delivery_status" text;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "order_number" text;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "supplier_phone" text;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "expected_delivery" timestamp;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "template_version_used" integer;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "template_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "amount_paid" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "remaining_amount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "payment_status" text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "currency" text DEFAULT 'MAD';--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "ice" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "if" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "rc" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "rib" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_person" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "credit_limit" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "rating" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "default_tax_mode" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_name" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lockout_until" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "max_products" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "max_clients" integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "max_suppliers" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_payment_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "next_payment_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "payment_mode" text DEFAULT 'subscription';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "billing_cycle" text DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "agreed_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "training_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "setup_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "amount_paid" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "installments_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "next_installment_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions_legacy" ADD CONSTRAINT "prescriptions_legacy_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frame_reservations" ADD CONSTRAINT "frame_reservations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frame_reservations" ADD CONSTRAINT "frame_reservations_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_contact_lens_details" ADD CONSTRAINT "sale_contact_lens_details_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lens_details" ADD CONSTRAINT "sale_lens_details_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_cash_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transactions" ADD CONSTRAINT "client_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptabilite_journal" ADD CONSTRAINT "comptabilite_journal_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_order_id_supplier_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_payments" ADD CONSTRAINT "supplier_order_payments_payment_id_supplier_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_payments" ADD CONSTRAINT "supplier_order_payments_order_id_supplier_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_order_id_supplier_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interactions_user_id_idx" ON "client_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interactions_client_id_idx" ON "client_interactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_user_invoice" ON "invoice_imports" USING btree ("user_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_import" ON "invoice_imports" USING btree ("user_id","supplier_id","invoice_number","invoice_date");--> statement-breakpoint
CREATE INDEX "reservations_user_id_idx" ON "reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reservations_client_id_idx" ON "reservations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sale_contact_lens_details_item_id_idx" ON "sale_contact_lens_details" USING btree ("sale_item_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sale_lens_details_item_id_idx" ON "sale_lens_details" USING btree ("sale_item_id");--> statement-breakpoint
CREATE INDEX "cash_movements_user_id_idx" ON "cash_movements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cash_movements_created_at_idx" ON "cash_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cash_sessions_user_id_idx" ON "cash_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cash_sessions_opened_at_idx" ON "cash_sessions" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "journal_sale_id_idx" ON "comptabilite_journal" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "journal_user_id_idx" ON "comptabilite_journal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_supplier_date" ON "supplier_payments" USING btree ("supplier_id","date","deleted_at");--> statement-breakpoint
CREATE INDEX "expenses_v2_store_id_idx" ON "expenses_v2" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "expenses_v2_user_id_idx" ON "expenses_v2" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expenses_v2_status_idx" ON "expenses_v2" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_v2_type_idx" ON "expenses_v2" USING btree ("type");--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_prescription_id_prescriptions_legacy_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions_legacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_supplier_order_id_supplier_orders_id_fk" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_matiere_id_materials_id_fk" FOREIGN KEY ("matiere_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_couleur_id_colors_id_fk" FOREIGN KEY ("couleur_id") REFERENCES "public"."colors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_full_name_idx" ON "clients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "clients_phone_idx" ON "clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_clients_fullname_search" ON "clients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "lens_orders_user_id_idx" ON "lens_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lens_orders_client_id_idx" ON "lens_orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "lens_orders_sale_id_idx" ON "lens_orders" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "lens_orders_supplier_id_idx" ON "lens_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "lens_orders_sphere_r_idx" ON "lens_orders" USING btree ("sphere_r");--> statement-breakpoint
CREATE INDEX "lens_orders_sphere_l_idx" ON "lens_orders" USING btree ("sphere_l");--> statement-breakpoint
CREATE INDEX "idx_lens_orders_pending" ON "lens_orders" USING btree ("user_id","created_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "idx_lens_orders_ready_for_delivery" ON "lens_orders" USING btree ("user_id","updated_at") WHERE status = 'received' AND sale_id IS NULL;--> statement-breakpoint
CREATE INDEX "products_user_id_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_reference_idx" ON "products" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "products_nom_idx" ON "products" USING btree ("nom");--> statement-breakpoint
CREATE INDEX "idx_products_user_marque" ON "products" USING btree ("user_id","marque");--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING btree ("marque","fournisseur");--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "idx_products_type" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "idx_products_not_deleted" ON "products" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_products_client" ON "products" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_dashboard" ON "reminders" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "idx_reminders_related" ON "reminders" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE INDEX "sales_user_id_idx" ON "sales" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sales_sale_number_idx" ON "sales" USING btree ("sale_number");--> statement-breakpoint
CREATE INDEX "sales_transaction_number_idx" ON "sales" USING btree ("transaction_number");--> statement-breakpoint
CREATE INDEX "sales_client_id_idx" ON "sales" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_sales_user_date" ON "sales" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_unique_number" ON "sales" USING btree ("user_id","sale_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_unique_transaction" ON "sales" USING btree ("user_id","transaction_number");--> statement-breakpoint
CREATE INDEX "idx_orders_supplier_date" ON "supplier_orders" USING btree ("supplier_id","date_commande","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_suppliers_active" ON "suppliers" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "firebase_id";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "prescription_data";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "reminder_type";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "target_date";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "notification_date";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "notification_offset_days";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "is_recurring";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "recurrence_interval";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "recurrence_unit";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "parent_reminder_id";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "next_reminder_id";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "related_entity_type";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "related_entity_id";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "notification_sent";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "notification_sent_at";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "notification_channels";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "dismissed_at";