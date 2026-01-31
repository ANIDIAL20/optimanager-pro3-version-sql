CREATE TABLE "account" (
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
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"prenom" text,
	"nom" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"gender" text,
	"cin" text,
	"date_of_birth" timestamp,
	"mutuelle" text,
	"notes" text,
	"balance" numeric(10, 2) DEFAULT '0',
	"total_spent" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"last_visit" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "clients_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "contact_lens_prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"client_id" integer,
	"prescription_data" json NOT NULL,
	"date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "contact_lens_prescriptions_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "devis" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"client_id" integer,
	"client_name" text NOT NULL,
	"client_phone" text,
	"items" json NOT NULL,
	"total_ht" numeric(10, 2) NOT NULL,
	"total_ttc" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'EN_ATTENTE',
	"sale_id" integer,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "devis_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "lens_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"client_id" integer,
	"prescription_id" integer,
	"order_type" text NOT NULL,
	"lens_type" text NOT NULL,
	"treatment" text,
	"supplier_name" text NOT NULL,
	"right_eye" json,
	"left_eye" json,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_date" timestamp DEFAULT now(),
	"received_date" timestamp,
	"delivered_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "lens_orders_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"client_id" integer,
	"prescription_data" json NOT NULL,
	"date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "prescriptions_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"reference" text,
	"nom" text NOT NULL,
	"designation" text,
	"categorie" text,
	"marque" text,
	"fournisseur" text,
	"prix_achat" numeric(10, 2),
	"prix_vente" numeric(10, 2) NOT NULL,
	"prix_gros" numeric(10, 2),
	"quantite_stock" integer DEFAULT 0,
	"seuil_alerte" integer DEFAULT 5,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "products_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"reminder_type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"target_date" timestamp NOT NULL,
	"notification_date" timestamp NOT NULL,
	"notification_offset_days" integer,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_interval" integer,
	"recurrence_unit" text,
	"parent_reminder_id" integer,
	"next_reminder_id" integer,
	"related_entity_type" text,
	"related_entity_id" text,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"notification_sent_at" timestamp,
	"notification_channels" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"completed_at" timestamp,
	"dismissed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"sale_number" text,
	"client_id" integer,
	"client_name" text,
	"client_phone" text,
	"client_mutuelle" text,
	"client_address" text,
	"total_ht" numeric(10, 2),
	"total_tva" numeric(10, 2),
	"total_ttc" numeric(10, 2) NOT NULL,
	"total_net" numeric(10, 2),
	"total_paye" numeric(10, 2) DEFAULT '0',
	"reste_a_payer" numeric(10, 2),
	"status" text DEFAULT 'impaye',
	"payment_method" text,
	"type" text,
	"items" json NOT NULL,
	"payment_history" json,
	"prescription_snapshot" json,
	"notes" text,
	"date" timestamp,
	"last_payment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "sales_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"setting_key" text NOT NULL,
	"value" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "settings_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"produit_id" text,
	"product_id" integer,
	"quantite" integer NOT NULL,
	"type" text NOT NULL,
	"ref" text,
	"date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stock_movements_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_id" text,
	"user_id" text NOT NULL,
	"fournisseur" text NOT NULL,
	"items" json NOT NULL,
	"montant_total" numeric(10, 2) NOT NULL,
	"montant_paye" numeric(10, 2) DEFAULT '0',
	"reste_a_payer" numeric(10, 2),
	"statut" text DEFAULT 'EN_COURS',
	"date_commande" timestamp,
	"date_reception" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "supplier_orders_firebase_id_unique" UNIQUE("firebase_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"category" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lens_prescriptions" ADD CONSTRAINT "contact_lens_prescriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis" ADD CONSTRAINT "devis_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devis" ADD CONSTRAINT "devis_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_orders" ADD CONSTRAINT "lens_orders_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;