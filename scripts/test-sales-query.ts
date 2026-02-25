import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../src/db';
import { sales } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
    try {
        const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
        const results = await db.query.sales.findMany({
            where: eq(sales.userId, userId),
            orderBy: [desc(sales.createdAt)],
            with: {
                client: true
            }
        });
        console.log('Success:', results.length);
    } catch (e) {
        console.error('ERROR =>', e);
    }
    process.exit(0);
}

main();
