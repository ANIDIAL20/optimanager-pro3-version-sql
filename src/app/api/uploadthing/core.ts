import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Image uploader for user avatars and product images
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      // Authenticate using Auth.js
      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      // Return metadata that will be available in onUploadComplete
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      // You can save to database here if needed
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Expense documents (receipts, invoices, etc.)
  expenseDocument: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 }
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Expense document upload complete:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
