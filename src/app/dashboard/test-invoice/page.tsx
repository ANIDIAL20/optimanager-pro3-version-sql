'use client';

import { createDocumentAction } from '@/app/actions/document-actions';
import { useState } from 'react';

export default function TestInvoicePage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleCreate = async () => {
        setLoading(true);
        // Ensure you have a client with ID 1 or change this
        const clientId = 1; 
        
        const payload: any = {
            type: 'INVOICE',
            clientId: clientId, 
            date: new Date(),
            items: [
                {
                    label: 'Monture Ray-Ban RX5154',
                    qty: 1,
                    price: 1800.00, // TTC
                    productType: 'frame',
                    tvaRate: 20
                },
                {
                    label: 'Verres Anti-Lumière Bleue',
                    qty: 2, // 2 lenses (1 pair usually, but line item logic varies. System handles items.)
                    price: 650.00, // Unit TTC
                    productType: 'lens',
                    tvaRate: 20,
                    lensDetails: [
                        { 
                            eye: 'OD', 
                            sphere: '-1.25', 
                            cylinder: '-0.50', 
                            axis: '100', 
                            treatment: 'HMC+Blue' 
                        },
                        { 
                            eye: 'OG', 
                            sphere: '-1.50', 
                            cylinder: '', 
                            axis: '', 
                            treatment: 'HMC+Blue' 
                        }
                    ]
                },
                {
                    label: 'Etui Rigide (Offert)',
                    qty: 1,
                    price: 0,
                    productType: 'accessory',
                    tvaRate: 20
                }
            ],
            notes: "Test invoice generated automatically.",
            paymentMethod: "Espèce"
        };
        
        try {
            const res = await createDocumentAction(payload);
            setResult(res);
            if (res?.success) {
                // Redirect to print view
                // window.open(`/print/document/${res.docId}`, '_blank');
            }
        } catch (e: any) {
            setResult({ success: false, error: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Test Invoice Generator</h1>
            <p className="mb-4 text-gray-600">This tool will generate a sample invoice using the new backend actions and schema.</p>
            
            <button 
                onClick={handleCreate} 
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Generate Invoice & Test'}
            </button>

            {result && (
                <div className={`mt-6 p-4 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {result.success ? (
                        <div>
                            <p className="font-bold text-green-800">✅ Invoice Created!</p>
                            <p>Number: {result.docNumber}</p>
                            <p>ID: {result.docId}</p>
                            <a 
                                href={`/print/document/${result.docId}`} 
                                target="_blank"
                                className="inline-block mt-4 text-blue-600 underline font-bold"
                            >
                                Open PDF View →
                            </a>
                        </div>
                    ) : (
                        <div>
                             <p className="font-bold text-red-800">❌ Error:</p>
                             <p>{result.error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
