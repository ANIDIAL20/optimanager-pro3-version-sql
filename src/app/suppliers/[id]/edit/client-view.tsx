'use client';

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function EditSupplierClientView() {
    return (
        <div className="flex flex-1 flex-col gap-4">
            <PageHeader
                title="Modifier le Fournisseur"
                description="Mise à jour en maintenance."
            />
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Maintenance</AlertTitle>
                <AlertDescription>
                    L'édition des fournisseurs est temporairement désactivée pour migration.
                </AlertDescription>
            </Alert>
        </div>
    );
}
