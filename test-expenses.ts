import { db } from './src/db';
import { expenses as expensesTable } from './src/db/schema/expenses';
import { sql, and, eq, between } from 'drizzle-orm';

async function main() {
    try {
        const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
        const startDate = new Date(2026, 2, 1);
        const endDate = new Date(2026, 2, 31, 23, 59, 59, 999);
        
        const totalStats = await db.select({
            totalAmount: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
            count: sql<number>`COUNT(*)`
        })
        .from(expensesTable)
        .where(and(
            eq(expensesTable.storeId, userId),
            between(expensesTable.createdAt, startDate, endDate)
        ));
        
        console.log("Success:", totalStats);
    } catch (error: any) {
        console.error("Caught error:");
        console.error(error.message);
        console.dir(error, { depth: null });
    }
}

main();
