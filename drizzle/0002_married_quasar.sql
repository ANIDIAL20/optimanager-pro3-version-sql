CREATE TABLE "supplier_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"remaining_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'open',
	"source_type" text,
	"reference" text,
	"notes" text,
	"related_receipt_id" uuid,
	"related_order_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"order_item_id" integer,
	"product_id" integer NOT NULL,
	"qty_ordered" integer DEFAULT 0,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"qty_rejected" integer DEFAULT 0,
	"unit_price" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"delivery_note_ref" text,
	"status" text DEFAULT 'draft',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"validated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "supplier_order_items" ALTER COLUMN "product_id" SET DATA TYPE integer USING (CASE WHEN "product_id"::text ~ '^[0-9]+$' THEN "product_id"::text::integer ELSE NULL END);--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD COLUMN "qty_received" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_related_order_id_supplier_orders_id_fk" FOREIGN KEY ("related_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_order_item_id_supplier_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."supplier_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_supplier_credits_supplier" ON "supplier_credits" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_credits_status" ON "supplier_credits" USING btree ("status");--> statement-breakpoint
ALTER TABLE "supplier_orders" DROP COLUMN "montant_paye";--> statement-breakpoint
ALTER TABLE "supplier_orders" DROP COLUMN "reste_a_payer";