import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SupplierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "SUPPLIER" && session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* 
        Here we will add the Supplier Sidebar later.
        For now just a simple topbar or placeholder sidebar.
      */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-4 text-xl font-bold border-b border-slate-800">
                    OptiMarket Portal
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <div className="px-4 py-2 bg-slate-800 rounded">Dashboard</div>
                </nav>
            </div>

            <main className="flex-1 overflow-y-auto w-full">
                {children}
            </main>
        </div>
    );
}
