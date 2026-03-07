import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: '.env.local' });

async function run() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sql = `
-- 1. goods_receipts
CREATE TABLE IF NOT EXISTS "goods_receipts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
    "delivery_note_ref" text,
    "status" text DEFAULT 'draft',
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    "validated_at" timestamp
);

-- 2. goods_receipt_items
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "receipt_id" uuid NOT NULL REFERENCES "goods_receipts"("id") ON DELETE CASCADE,
    "order_item_id" integer,
    "product_id" integer NOT NULL,
    "qty_ordered" integer DEFAULT 0,
    "qty_received" integer DEFAULT 0 NOT NULL,
    "qty_rejected" integer DEFAULT 0,
    "unit_price" numeric(15,2)
);

-- 3. supplier_credits
CREATE TABLE IF NOT EXISTS "supplier_credits" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
    "amount" numeric(15,2) NOT NULL,
    "remaining_amount" numeric(15,2) NOT NULL,
    "status" text DEFAULT 'open',
    "source_type" text,
    "reference" text,
    "notes" text,
    "related_receipt_id" uuid REFERENCES "goods_receipts"("id") ON DELETE SET NULL,
    "related_order_id" uuid REFERENCES "supplier_orders"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "idx_goods_receipts_supplier" 
  ON "goods_receipts" ("supplier_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipt_items_receipt" 
  ON "goods_receipt_items" ("receipt_id");

CREATE INDEX IF NOT EXISTS "idx_supplier_credits_supplier" 
  ON "supplier_credits" ("supplier_id");

CREATE INDEX IF NOT EXISTS "idx_supplier_credits_status" 
  ON "supplier_credits" ("supplier_id", "status");

CREATE INDEX IF NOT EXISTS "idx_orders_supplier_date" 
  ON "supplier_orders" ("supplier_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "idx_payments_supplier_date" 
  ON "supplier_payments" ("supplier_id");
    `;

    try {
        console.log("🚀 Running manual SQL migration...");
        await pool.query(sql);
        console.log("✅ Manual migration successful.");
    } catch (e) {
        console.error("❌ Manual migration failed:", e);
    } finally {
        await pool.end();
    }
}

run();
