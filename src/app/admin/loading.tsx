import { Loader2 } from "lucide-react";

export default function AdminLoading() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-sm font-medium animate-pulse text-slate-400">
                Vérification de l'accès Super Admin...
            </p>
        </div>
    );
}
