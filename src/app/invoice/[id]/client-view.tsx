'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StandaloneInvoicePage() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Facture en maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>La visualisation des factures est temporairement indisponible durant la migration vers SQL.</p>
                </CardContent>
            </Card>
        </div>
    );
}
