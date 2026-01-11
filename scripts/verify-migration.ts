/**
 * Quick script to verify migration results
 */
import { db } from '../src/db';
import { clients } from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyMigration() {
    try {
        console.log('\n📊 Checking migration results...\n');
        
        // Count total clients
        const allClients = await db.select().from(clients);
        
        console.log(`✅ Total clients in Neon: ${allClients.length}`);
        console.log('\n' + '='.repeat(60));
        console.log('📋 Sample clients:');
        console.log('='.repeat(60));
        
        // Show first 10 clients
        allClients.slice(0, 10).forEach((client, index) => {
            console.log(`\n${index + 1}. ${client.fullName}`);
            console.log(`   ID: ${client.id} | Firebase ID: ${client.firebaseId}`);
            console.log(`   Phone: ${client.phone || 'N/A'}`);
            console.log(`   Balance: ${client.balance} MAD`);
            console.log(`   Created: ${client.createdAt?.toLocaleDateString() || 'N/A'}`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`✨ Migration verification complete!`);
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('❌ Error verifying migration:', error);
    }
    
    process.exit(0);
}

verifyMigration();
