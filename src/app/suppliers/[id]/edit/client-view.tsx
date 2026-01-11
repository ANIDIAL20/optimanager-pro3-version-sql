'use client';

import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "../../_components/supplier-form";
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Supplier } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";

export default function EditSupplierClientView() {
    const params = useParams();
    const id = params.id as string;

    const firestore = useFirestore();
    const { user } = useFirebase();
    const supplierRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, `stores/${user.uid}/suppliers`, id) : null),
        [firestore, user, id]
    );
    const { data: supplier, isLoading, error } = useDoc<Supplier>(supplierRef);

    if (isLoading) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <PageHeader
                    title="Modifier le Fournisseur"
                    description="Mise à jour des informations du fournisseur."
                />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-1/6" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-1/6" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
                Impossible de charger les données du fournisseur.
            </AlertDescription>
        </Alert>
    }

    if (!supplier) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fournisseur non trouvé</AlertTitle>
            <AlertDescription>
                Aucun fournisseur trouvé avec cet identifiant.
            </AlertDescription>
        </Alert>
    }

    return (
        <div className="flex flex-1 flex-col gap-4">
            <PageHeader
                title="Modifier le Fournisseur"
                description={`Mise à jour du profil de ${supplier.nomCommercial}.`}
            />
            <SupplierForm supplier={supplier} />
        </div>
    );
}
