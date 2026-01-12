'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { getPrintData } from '@/app/actions/print-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { useToast } from '@/hooks/use-toast';

interface InvoicePageProps {
    params: Promise<{ id: string }>;
}



export default function InvoicePage({ params }: InvoicePageProps) {
    const { id } = React.use(params);
    const router = useRouter();
    const { user } = useFirebase();
    const { toast } = useToast();

    const [data, setData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user || !id) return;

            // ✅ FIX: secureAction injects userId automatically
            const result = await getPrintData(id, 'facture');

            if (result.success) {
                setData(result.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result.error
                });
                router.push('/dashboard/ventes');
            }
            setIsLoading(false);
        };

        fetchData();
    }, [user, id, router, toast]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-auto flex flex-col items-center py-8 text-black">
            {/* Toolbar (Hidden on Print) */}
            <div className="w-full max-w-[210mm] mb-6 flex justify-between px-4 print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimer Facture
                </Button>
            </div>

            {/* Shared Template */}
            <PrintDocumentTemplate type="facture" data={data} />
        </div>
    );
}
