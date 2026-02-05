
import { db } from "@/db";
import { sales } from "@/db/schema";
import { gt, eq, and } from "drizzle-orm";

async function reproduce() {
  console.log("Attempting to reproduce query failure (Number 0)...");
  
  const userId = "d7daf565-32ff-482d-b798-63120fd75e66"; 
  
  try {
    console.log("Running query with NUMBER 0...");
    const unpaidSales = await db
        .select()
        .from(sales)
        .where(
        and(
            eq(sales.userId, userId),
            // @ts-ignore
            gt(sales.resteAPayer, 0) // EXACTLY AS IN CODE
        )
        );
    
    console.log("Query Success! Found:", unpaidSales.length);
  } catch (error: any) {
    console.error("Query Failed!");
    console.error("Message:", error.message);
  }
  process.exit(0);
}

reproduce();
