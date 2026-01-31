"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateUserImage(imageUrl: string) {
  try {
    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Update user image in database
    await db
      .update(users)
      .set({ image: imageUrl })
      .where(eq(users.id, session.user.id));

    // Revalidate relevant paths
    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true, message: "Image updated successfully" };
  } catch (error: any) {
    console.error("Error updating user image:", error);
    return { success: false, error: error.message || "Failed to update image" };
  }
}

export async function removeUserImage() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(users)
      .set({ image: null })
      .where(eq(users.id, session.user.id));

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true, message: "Image removed successfully" };
  } catch (error: any) {
    console.error("Error removing user image:", error);
    return { success: false, error: error.message || "Failed to remove image" };
  }
}
