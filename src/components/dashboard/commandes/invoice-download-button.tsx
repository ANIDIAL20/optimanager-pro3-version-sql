'use client';

import * as React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useFirebase } from '@/firebase';
import { InvoicePDF } from '@/components/invoices/InvoicePDF';
import { useShopSettings } from '@/hooks/use-shop-settings';
import type { Sale, Client } from '@/lib/types';

interface InvoiceDownloadButtonProps {
    sale: Sale;
    onClick?: () => void;
}

export function InvoiceDownloadButton({ sale, onClick }: InvoiceDownloadButtonProps) {
    const [client, setClient] = React.useState<Client | null>(null);
    const [isLoadingClient, setIsLoadingClient] = React.useState(true);
    const { settings, isLoading: isLoadingSettings } = useShopSettings();
    const firestore = useFirestore();
    const { user } = useFirebase();

    // Fetch client data
    React.useEffect(() => {
        const fetchClient = async () => {
            if (!firestore || !user || !sale.clientId) {
                setIsLoadingClient(false);
                return;
            }

            try {
                const clientRef = doc(firestore, `stores/${user.uid}/clients`, sale.clientId);
                const clientSnap = await getDoc(clientRef);

                if (clientSnap.exists()) {
                    setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
                }
            } catch (error) {
                console.error('Error fetching client:', error);
            } finally {
                setIsLoadingClient(false);
            }
        };

        fetchClient();
    }, [firestore, user, sale.clientId]);

    // Show loading state while fetching data
    if (isLoadingClient || isLoadingSettings) {
        return (
            <div className="flex items-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
            </div>
        );
    }

    // Show error if no client or settings
    if (!client || !settings) {
        return (
            <div className="flex items-center text-slate-500">
                <FileText className="mr-2 h-4 w-4" />
                Données indisponibles
            </div>
        );
    }

    return (
        <PDFDownloadLink
            document={<InvoicePDF sale={sale} client={client} shopSettings={settings} />}
            fileName={`facture-${sale.id.substring(0, 8)}-${new Date().getTime()}.pdf`}
        >
            {({ loading }) => (
                <div onClick={onClick} className="flex items-center w-full cursor-pointer">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Génération...
                        </>
                    ) : (
                        <>
                            <FileText className="mr-2 h-4 w-4" />
                            Télécharger Facture
                        </>
                    )}
                </div>
            )}
        </PDFDownloadLink>
    );
}
