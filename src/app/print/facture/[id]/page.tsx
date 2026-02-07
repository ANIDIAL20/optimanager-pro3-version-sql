'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { getPrintData } from '@/app/actions/print-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { useToast } from '@/hooks/use-toast';

interface FacturePrintPageProps {
    params: Promise<{ id: string }>;
}

export default function FacturePrintPage({ params }: FacturePrintPageProps) {
    const { id } = React.use(params);
    const router = useRouter();
    const { toast } = useToast();

    // Auto print logic
    const searchParams = useSearchParams();
    const shouldAutoPrint = searchParams.get('auto') === 'true';

    const [data, setData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            // Fetch data for 'facture' (sales)
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
    }, [id, router, toast]);

    // Auto-print effect
    React.useEffect(() => {
        if (!isLoading && data && shouldAutoPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isLoading, data, shouldAutoPrint]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
                <BrandLoader size="md" className="text-gray-400" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-8 text-black print:p-0 print:block print:h-auto">
            {/* Toolbar (Hidden on Print and Preview) */}
            {!searchParams.get('preview') && (
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
            )}

            {/* Shared Template with type="facture" */}
            <PrintDocumentTemplate type="facture" data={data} />
        </div>
    );
}
