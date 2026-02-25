
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function test() {
    dotenv.config({ path: '.env.local' });
    const { db } = await import('./src/db/index');
    const { frameReservations } = await import('./src/db/schema');
    const { eq, desc } = await import('drizzle-orm');
    try {
        console.log("DB URL Present:", !!process.env.DATABASE_URL);
        const { getClientReservations } = await import('./src/features/reservations/queries/get-client-reservations');
        console.log("Running getClientReservations(33)...");
        const results = await getClientReservations(33);
        console.log("Query success! Results count:", results.length);
    } catch (e: any) {
        console.error("Query FAILED in test script:", e.message);
        console.error(e);
    }
}

test();
