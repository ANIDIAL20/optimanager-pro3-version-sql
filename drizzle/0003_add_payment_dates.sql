ALTER TABLE "users" ADD COLUMN "last_payment_date" timestamp;
ALTER TABLE "users" ADD COLUMN "next_payment_date" timestamp;
ALTER TABLE "users" ADD COLUMN "subscription_expiry" timestamp;
