import { SupplierForm } from "../_components/supplier-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";

export default function NewSupplierPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                  <Link href="/suppliers">
                      <ArrowLeft className="h-5 w-5 text-slate-500" />
                  </Link>
              </Button>
              <div>
                  <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                              <Truck className="h-6 w-6" />
                          </div>
                          Ajouter un Fournisseur
                      </h1>
                  </div>
                  <p className="text-slate-500 ml-1">Remplissez les détails ci-dessous pour créer un nouveau fournisseur dans la base de données</p>
              </div>
          </div>
      </div>
      <SupplierForm />
    </div>
  );
}
