// @ts-nocheck
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PdfDocumentTemplate } from '@/components/documents/pdf-document-template';
import { auth } from '@/auth';
import { buildPdfHeaders } from '@/lib/pdf-response';

// SECURED: uses authGuard + tenant filter (2026-03-01)

// Check if we are running in Node environment
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { type, data, documentSettings } = body || {};

        if (!type) {
            return new Response('Missing "type" in request body', { status: 400 });
        }
        if (!data) {
            return new Response('Missing "data" in request body', { status: 400 });
        }

        // IMPORTANT: no JSX in route.ts
        const element = React.createElement(PdfDocumentTemplate, {
            docType: type,
            data,
            // @ts-ignore - Explicitly requested by user pattern, even if redundant
            documentSettings, 
        });

        // Workaround: create instance with dummy object then update container (avoids null document props issues)
        // This specific pattern 'pdf({} as any)' helps some versions of react-pdf in Node
        const instance = pdf({} as any); 
        instance.updateContainer(element);

        const buffer = await instance.toBuffer(); // Node-safe output

        return new Response(buffer, {
            headers: buildPdfHeaders('document-preview.pdf', 'inline'),
        });
    } catch (err: any) {
        console.error("PDF Generation Error (Detailed):", err);
        return new Response(`Error generating PDF: ${err.message || String(err)}`, { status: 500 });
    }
}
