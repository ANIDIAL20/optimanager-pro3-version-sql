import { requireAdmin } from "@/lib/admin-utils";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This Layout acts as a strict security barrier.
    // No page inside /admin will render unless this passes.
    await requireAdmin();

    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}
