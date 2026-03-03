import { auth } from "@/auth";

export default async function SupplierDashboardPage() {
    const session = await auth();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Tableau de bord M&apos;Fournisseur</h1>
            <p className="text-gray-600 mb-8">
                Bienvenue {session?.user?.name || "Fournisseur"} sur votre portail OptiMarket.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500">Commandes en attente</h3>
                    <p className="text-2xl font-bold mt-2">0</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500">Produits au catalogue</h3>
                    <p className="text-2xl font-bold mt-2">0</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500">Chiffre d&apos;affaires (Mois)</h3>
                    <p className="text-2xl font-bold mt-2">0,00 MAD</p>
                </div>
            </div>
        </div>
    );
}
