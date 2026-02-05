ALTER TABLE "users" ADD COLUMN "payment_mode" text DEFAULT 'subscription';
ALTER TABLE "users" ADD COLUMN "billing_cycle" text DEFAULT 'monthly';
ALTER TABLE "users" ADD COLUMN "agreed_price" numeric(10, 2);
ALTER TABLE "users" ADD COLUMN "amount_paid" numeric(10, 2) DEFAULT '0';
ALTER TABLE "users" ADD COLUMN "installments_count" integer DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "next_installment_date" timestamp;
