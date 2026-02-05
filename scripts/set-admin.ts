import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "ousayehamine3002@gmail.com";

async function setAdmin() {
  console.log("🔄 Elevating user to ADMIN role...");
  
  try {
    const result = await db
      .update(users)
      .set({ 
        role: "ADMIN",
        isActive: true,
        failedLoginAttempts: 0, 
        lockoutUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, ADMIN_EMAIL))
      .returning();

    if (result.length === 0) {
      console.error("\n❌ ERROR: User not found. Please sign in once first.");
      process.exit(1);
    }

    console.log("\n✅ SUCCESS: Admin role assigned to:", result[0].email);
    console.log("👤 Role:", result[0].role);
    console.log("✓ Active:", result[0].isActive);
    
  } catch (error) {
    console.error("\n❌ Database Error:", error);
    process.exit(1);
  }
}

setAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
