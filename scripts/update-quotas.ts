import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('🚀 Starting quota update...');
    console.log('📍 Current working directory:', process.cwd());
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is missing in environment!');
        process.exit(1);
    }
    console.log('✅ DATABASE_URL found.');

    try {
        console.log('📦 Importing database modules...');
        const { db } = await import('../src/db');
        const { users } = await import('../src/db/schema');
        const { sql } = await import('drizzle-orm');

        console.log('🔄 Executing update query...');
        const result = await db.update(users).set({ 
            maxProducts: 500, 
            maxClients: 200, 
            maxSuppliers: 100 
        }).execute();
        
        console.log('✅ Quotas updated for all existing users');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating quotas:', error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

main();
