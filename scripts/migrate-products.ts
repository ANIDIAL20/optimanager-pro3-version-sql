import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

// Dynamic import for DB to ensure env is loaded
const { db } = require('../src/db');

async function migrateProducts() {
    console.log("🚀 Starting products migration...");

    try {
        // 1. Add Columns (Idempotent)
        const columns = [
            "ADD COLUMN IF NOT EXISTS brand VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'OPTIQUE'",
            "ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'accessory'",
            "ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5,2) DEFAULT 20.00",
            "ADD COLUMN IF NOT EXISTS is_medical BOOLEAN DEFAULT false",
            "ADD COLUMN IF NOT EXISTS is_stock_managed BOOLEAN DEFAULT true"
        ];

        console.log("📦 Updating schema...");
        for (const col of columns) {
            try {
                await db.execute(sql.raw(`ALTER TABLE products ${col}`));
                console.log(`   ✅ Executed: ${col}`);
            } catch (e: any) {
                console.log(`   ⚠️ Schema Note: ${e.message}`);
            }
        }

        // 2. Data Migration: Product Type & Category
        console.log("🔄 Migrating data...");
        
        // Frame
        const resFrame = await db.execute(sql`
            UPDATE products 
            SET product_type = 'frame', category = 'Montures'
            WHERE categorie = 'Montures' OR category = 'Montures'
        `);
        console.log(`   👓 Frames updated`);

        // Lens
        const resLens = await db.execute(sql`
            UPDATE products 
            SET product_type = 'lens', category = 'OPTIQUE'
            WHERE categorie IN ('OPTIQUE', 'CatForTest', 'Verres')
        `);
        console.log(`   🔍 Lenses updated`);

        // Contact Lens
        const resContact = await db.execute(sql`
            UPDATE products 
            SET product_type = 'contact_lens', category = 'Lentilles de Contact' 
            WHERE categorie LIKE '%Lentilles%' OR category LIKE '%Lentilles%'
        `);
        console.log(`   👁️ Contact lenses updated`);

        // Accessory
        const resAcc = await db.execute(sql`
            UPDATE products 
            SET product_type = 'accessory', category = 'Accessoires'
            WHERE categorie IN ('Accessoires', 'CLIP', 'Cordons', 'Etuis')
        `);
        console.log(`   👜 Accessories updated`);

        // 3. Ensure References exists
        // Use Postgres random unique string if conflict, or just ID based
        console.log("🔄 Generating missing references...");
        await db.execute(sql`
            UPDATE products 
            SET reference = 'REF-' || LPAD(id::TEXT, 5, '0')
            WHERE reference IS NULL OR reference = ''
        `);

        // 4. Populate Brand from Marque
        console.log("🔄 Syncing Brand/Marque...");
        await db.execute(sql`
            UPDATE products 
            SET brand = marque 
            WHERE (brand IS NULL OR brand = '') AND (marque IS NOT NULL AND marque != '')
        `);
        
        // Sync reverse (optional, but good for consistency if brand was set directly)
        await db.execute(sql`
            UPDATE products 
            SET marque = brand 
            WHERE (marque IS NULL OR marque = '') AND (brand IS NOT NULL AND brand != '')
        `);

        console.log("✨ Products migration complete!");

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrateProducts();
