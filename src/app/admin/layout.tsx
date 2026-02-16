import { requireAdmin } from "@/lib/auth-guard";
// Security migration verified


export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 🔒 Security barrier: No page inside /admin will render unless this passes.
    // This provides Page-Level (Fallback) protection as a secondary layer to Middleware.
    await requireAdmin();

    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}
