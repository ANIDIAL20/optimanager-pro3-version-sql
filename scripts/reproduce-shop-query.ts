
import { db } from "../src/db";
import { shopProfiles } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const userId = "d7daf565-32ff-482d-b798-63120fd75e66"; // From error message
    console.log("Querying for user:", userId);

    const profile = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.userId, userId),
    });
    
    console.log("Result:", profile ? "Found" : "Not Found");
    if (profile) {
        console.log("Name:", profile.shopName);
    }
  } catch (error) {
    console.error("Drizzle Query Error:", error);
  } finally {
    process.exit(0);
  }
}

main();
