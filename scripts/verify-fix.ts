
import { db } from "@/db";
import { sales } from "@/db/schema";
import { gt, eq, and } from "drizzle-orm";

async function verifyFix() {
  console.log("Verifying fix with String '0'...");
  
  const userId = "d7daf565-32ff-482d-b798-63120fd75e66"; 
  
  try {
    console.log("Running query with STRING '0'...");
    const unpaidSales = await db
        .select()
        .from(sales)
        .where(
        and(
            eq(sales.userId, userId),
            gt(sales.resteAPayer, '0') // FIX APPLIED
        )
        );
    
    console.log("Query Success! Found:", unpaidSales.length);
  } catch (error: any) {
    console.error("Query Failed!");
    console.error("Message:", error.message);
  }
  process.exit(0);
}

verifyFix();
