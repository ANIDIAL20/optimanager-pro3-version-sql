'use client';

import React, { useEffect, useState } from 'react';
import { pdf } from '@react-pdf/renderer'; 
import { PdfDocumentTemplate } from '@/components/documents/pdf-document-template';
import { Loader2 } from 'lucide-react';

interface DocumentPreviewClientProps {
    type: 'devis' | 'facture' | 'bc' | 'bl';
    data: any;
    documentSettings?: any;
}

export default function DocumentPreviewClient({ type, data, documentSettings }: DocumentPreviewClientProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract settings if passed inside data, or use prop (prefer prop if available)
    const settingsToUse = documentSettings || data?.documentSettings;

    useEffect(() => {
        let active = true;
        const generatePdf = async () => {
            setLoading(true);
            setError(null);
            try {
                // Generates blob manually using imperative API to avoid React 19 component crashes
                const blob = await pdf(
                    <PdfDocumentTemplate 
                        docType={type} 
                        data={{ 
                            ...data, 
                            documentSettings: settingsToUse 
                        }} 
                        documentSettings={settingsToUse}
                    />
                ).toBlob();

                const url = URL.createObjectURL(blob);
                
                if (active) {
                    setPdfUrl(prev => {
                        if (prev) URL.revokeObjectURL(prev);
                        return url;
                    });
                } else {
                    URL.revokeObjectURL(url);
                }
            } catch (err: any) {
                console.error("PDF Generation Error:", err);
                if (active) setError(err.message || "Erreur de génération PDF");
            } finally {
                if (active) setLoading(false);
            }
        };

        // Debounce slightly to avoid heavy rendering on every keystroke
        const timer = setTimeout(generatePdf, 600);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [type, data, settingsToUse]);

    // Cleanup final URL
    useEffect(() => {
        return () => {
             if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    return (
        <div className="w-full h-full min-h-[600px] border rounded-lg overflow-hidden bg-gray-100 flex flex-col">
            {loading && (
                <div className="flex flex-col items-center justify-center flex-1 bg-white/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <span className="text-sm text-gray-500">Génération de l'aperçu...</span>
                </div>
            )}

            {error && !loading && (
                 <div className="flex flex-col items-center justify-center flex-1 text-red-500 p-4 text-center">
                    <p className="font-bold mb-2">Erreur</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && pdfUrl && (
                <iframe
                    src={pdfUrl + '#toolbar=0&view=FitH'}
                    className="w-full h-full border-0 bg-white"
                    title="PDF Preview"
                />
            )}
            
            {!loading && !error && !pdfUrl && (
                <div className="flex items-center justify-center flex-1 text-gray-400">
                    Initialisation...
                </div>
            )}
        </div>
    );
}
