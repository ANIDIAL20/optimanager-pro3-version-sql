DO $$
BEGIN
    ALTER TABLE "users" ADD COLUMN "training_price" numeric(10, 2) DEFAULT '0';
    ALTER TABLE "users" ADD COLUMN "setup_price" numeric(10, 2) DEFAULT '0';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
