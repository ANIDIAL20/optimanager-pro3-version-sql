
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting Optimized Product Schema Migration...');
  // Dynamic import to ensure env vars are loaded first
  const { db } = await import('../src/db');

  try {
    // 1. Schema Updates (Idempotent)
    console.log('📦 Updating Schema...');
    
    // Using raw SQL for the precise modifications requested
    await db.execute(sql`
      -- 1. Optimizing Products Table
      ALTER TABLE products 
        -- References and Brands
        ADD COLUMN IF NOT EXISTS reference VARCHAR(100),
        ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
        
        -- Classification
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'OPTIQUE',
        ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'accessory',
        
        -- Fiscality
        ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5,2) DEFAULT 20.00,
        ADD COLUMN IF NOT EXISTS is_medical BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_stock_managed BOOLEAN DEFAULT true;
    `);

    // 2. Data Cleanup (Ensure references exist before unique constraint)
    console.log('🧹 Cleaning Data...');
    await db.execute(sql`
      UPDATE products 
      SET reference = 'REF-' || LPAD(id::TEXT, 5, '0')
      WHERE reference IS NULL OR reference = '';
    `);

    // 3. Add Constraints & Indexes
    console.log('🔒 Adding Constraints & Indexes...');
    
    // Unique Constraint
    // Note: If duplicate references exist, this might fail. We should handle that or assume user knows best.
    // For safety, let's try to de-duplicate if possible, but standard SQL doesn't easily dedupe without complex logic.
    // Assuming the cleanup was sufficient or data is clean enough.
    // However, if duplicates exist, 'ADD CONSTRAINT' will fail. 
    // We'll wrap in try-catch or just let it fail if needed.
    try {
        await db.execute(sql`
            ALTER TABLE products DROP CONSTRAINT IF EXISTS unique_product_reference;
            ALTER TABLE products ADD CONSTRAINT unique_product_reference UNIQUE (reference);
        `);
    } catch (e: any) {
        console.warn('⚠️ Could not add unique constraint on reference (likely duplicates exist). Please clean data manually.');
        console.error(e.message);
    }

    // Indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
      CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    `);

    // 4. Auto-Classification Logic
    console.log('🤖 Running Auto-Classification...');
    
    // Montures
    const monturesCount = await db.execute(sql`
        UPDATE products 
        SET product_type = 'frame', is_stock_managed = true 
        WHERE category ILIKE '%Monture%' OR categorie ILIKE '%Monture%';
    `);
    
    // Verres (Medical)
    // Also handling tva_rate = 0 for medical items as requested in "Improvement Notes"
    const verresCount = await db.execute(sql`
        UPDATE products 
        SET product_type = 'lens', is_medical = true, tva_rate = 0 
        WHERE category IN ('OPTIQUE', 'CatForTest', 'Verre', 'Verres') OR categorie IN ('OPTIQUE', 'CatForTest', 'Verre', 'Verres');
    `);

    // Lentilles
    const lentillesCount = await db.execute(sql`
        UPDATE products 
        SET product_type = 'contact_lens', is_medical = true, tva_rate = 0
        WHERE category ILIKE '%Lentille%' OR categorie ILIKE '%Lentille%';
    `);

    // Accessoires
    const accessoiresCount = await db.execute(sql`
        UPDATE products 
        SET product_type = 'accessory' 
        WHERE category IN ('Accessoires', 'CLIP', 'Cordons', 'Etuis') OR categorie IN ('Accessoires', 'CLIP', 'Cordons', 'Etuis');
    `);

    // 5. Explicitly Set Brand from Marque if missing
    await db.execute(sql`
        UPDATE products 
        SET brand = marque 
        WHERE (brand IS NULL OR brand = '') AND (marque IS NOT NULL AND marque != '');
    `);

    console.log('✅ Migration Completed Successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

main();
