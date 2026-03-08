ALTER TABLE "supplier_order_items"
  ADD CONSTRAINT "supplier_order_items_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;

ALTER TABLE "goods_receipt_items"
  DROP CONSTRAINT IF EXISTS "goods_receipt_items_product_id_products_id_fk";

ALTER TABLE "goods_receipt_items"
  ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "goods_receipt_items"
  ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;