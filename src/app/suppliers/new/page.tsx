
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "../_components/supplier-form";
import { BackButton } from "@/components/ui/back-button";

export default function NewSupplierPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="w-fit">
        <BackButton />
      </div>
      <PageHeader
        title="Ajouter un Fournisseur"
        description="Remplissez les détails ci-dessous pour créer un nouveau fournisseur."
      />
      <SupplierForm />
    </div>
  );
}
