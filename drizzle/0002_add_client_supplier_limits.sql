ALTER TABLE "users" ADD COLUMN "max_clients" integer DEFAULT 20 NOT NULL;
ALTER TABLE "users" ADD COLUMN "max_suppliers" integer DEFAULT 10 NOT NULL;
