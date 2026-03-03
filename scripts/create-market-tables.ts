import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const client = await pool.connect();
    console.log('Connected to DB...');
    try {
        console.log('Creating market_supplier_profiles...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_supplier_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        logo_url TEXT,
        description TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        ice TEXT,
        rc TEXT,
        rib TEXT,
        payment_terms TEXT DEFAULT '30',
        min_order_amount NUMERIC(10, 2) DEFAULT '0',
        shipping_info TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        verified_at TIMESTAMP,
        verified_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS msp_user_id_idx ON market_supplier_profiles(user_id);
      CREATE INDEX IF NOT EXISTS msp_status_idx ON market_supplier_profiles(status);
    `);

        console.log('Creating market_categories...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        slug TEXT NOT NULL UNIQUE,
        icon TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

        console.log('Creating market_products...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        category_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        reference TEXT,
        brand TEXT,
        type TEXT NOT NULL DEFAULT 'AUTRE',
        material TEXT,
        color TEXT,
        unit_price_ht NUMERIC(10, 2) NOT NULL,
        tva_rate NUMERIC(5, 2) DEFAULT '20',
        unit_price_ttc NUMERIC(10, 2),
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        min_order_qty INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT false,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        tags TEXT[],
        specs JSON,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS mp_supplier_id_idx ON market_products(supplier_id);
      CREATE INDEX IF NOT EXISTS mp_category_id_idx ON market_products(category_id);
      CREATE INDEX IF NOT EXISTS mp_status_idx ON market_products(status);
      CREATE INDEX IF NOT EXISTS mp_type_idx ON market_products(type);
      CREATE INDEX IF NOT EXISTS mp_brand_idx ON market_products(brand);
    `);

        console.log('Creating market_product_images...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_product_images (
        id SERIAL PRIMARY KEY,
        product_id UUID NOT NULL,
        url TEXT NOT NULL,
        alt_text TEXT,
        sort_order INTEGER DEFAULT 0,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS mpi_product_id_idx ON market_product_images(product_id);
    `);

        console.log('Creating market_orders...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number TEXT NOT NULL UNIQUE,
        optician_id TEXT NOT NULL,
        supplier_id UUID NOT NULL,
        erp_order_id INTEGER,
        status TEXT NOT NULL DEFAULT 'PENDING',
        sub_total_ht NUMERIC(10, 2) NOT NULL,
        tva_amount NUMERIC(10, 2) DEFAULT '0',
        shipping_cost NUMERIC(10, 2) DEFAULT '0',
        total_ttc NUMERIC(10, 2) NOT NULL,
        payment_method TEXT DEFAULT 'CREDIT',
        payment_status TEXT NOT NULL DEFAULT 'UNPAID',
        amount_paid NUMERIC(10, 2) DEFAULT '0',
        shipping_address TEXT,
        expected_delivery TIMESTAMP,
        notes TEXT,
        confirmed_at TIMESTAMP,
        shipped_at TIMESTAMP,
        delivered_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS mo_optician_id_idx ON market_orders(optician_id);
      CREATE INDEX IF NOT EXISTS mo_supplier_id_idx ON market_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS mo_status_idx ON market_orders(status);
    `);

        console.log('Creating market_order_items...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_order_items (
        id SERIAL PRIMARY KEY,
        order_id UUID NOT NULL,
        product_id UUID NOT NULL,
        product_snapshot JSON NOT NULL,
        quantity INTEGER NOT NULL,
        received_quantity INTEGER NOT NULL DEFAULT 0,
        unit_price_ht NUMERIC(10, 2) NOT NULL,
        total_price_ht NUMERIC(10, 2) NOT NULL,
        erp_product_id INTEGER,
        stock_synced BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS moi_order_id_idx ON market_order_items(order_id);
      CREATE INDEX IF NOT EXISTS moi_product_id_idx ON market_order_items(product_id);
    `);

        console.log('Creating market_order_messages...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_order_messages (
        id SERIAL PRIMARY KEY,
        order_id UUID NOT NULL,
        sender_id TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        content TEXT NOT NULL,
        attachment_url TEXT,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS mom_order_id_idx ON market_order_messages(order_id);
      CREATE INDEX IF NOT EXISTS mom_sender_id_idx ON market_order_messages(sender_id);
    `);

        console.log('Creating market_credit_accounts...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_credit_accounts (
        id SERIAL PRIMARY KEY,
        supplier_id UUID NOT NULL,
        optician_id TEXT NOT NULL,
        credit_limit NUMERIC(10, 2) NOT NULL DEFAULT '0',
        current_balance NUMERIC(10, 2) NOT NULL DEFAULT '0',
        payment_terms TEXT,
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS mca_supplier_optician_idx ON market_credit_accounts(supplier_id, optician_id);
      CREATE INDEX IF NOT EXISTS mca_supplier_id_idx ON market_credit_accounts(supplier_id);
      CREATE INDEX IF NOT EXISTS mca_optician_id_idx ON market_credit_accounts(optician_id);
    `);

        console.log('✅ All OptiMarket tables created successfully without dropping old data!');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    } finally {
        client.release();
        pool.end();
    }
}

main();
