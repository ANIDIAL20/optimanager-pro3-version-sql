
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
console.log("DB URL Present:", !!process.env.DATABASE_URL);

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql } = require('drizzle-orm');
const ws = require('ws');

// Set WebSocket for Node.js
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

async function checkTable() {
    try {
        const { getClientReservations } = await import('./src/features/reservations/queries/get-client-reservations');
        console.log("Running getClientReservations(33)...");
        const results = await getClientReservations(33);
        console.log("Query success! Results count:", results.length);
        
        await pool.end();
    } catch (error) {
        console.error("Error checking table:", error);
    }
}

checkTable();
