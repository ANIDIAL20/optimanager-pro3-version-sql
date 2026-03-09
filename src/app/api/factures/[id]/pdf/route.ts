// SECURED: uses authGuard + tenant filter (2026-03-01)
import { db } from '@/db';
import { sales, lensOrders, shopProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { generateDocumentPDFStream } from '@/lib/pdf-generator';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import { buildPdfHeaders } from '@/lib/pdf-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ UPDATED
    const forceLatest = new URL(req.url).searchParams.get('latest') === 'true';

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const saleId = parseInt(id);
    
    if (isNaN(saleId)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }

    // 1. Fetch Sale
    const sale = await db.query.sales.findFirst({
        where: and(eq(sales.id, saleId), eq(sales.userId, session.user.id)),
        with: {
            client: true
        }
    });

    if (!sale) {
        return new NextResponse('Facture not found', { status: 404 });
    }

    // 2. Fetch Shop Profile (to get ID and static info)
    const profile = await db.query.shopProfiles.findFirst({
        where: eq(shopProfiles.userId, session.user.id)
    });

    if (!profile) {
        return new NextResponse('Shop Profile not found', { status: 404 });
    }

    // 3. Fetch Linked Lens Orders (to enrich items if needed)
    const linkedLensOrders = await db.query.lensOrders.findMany({
        where: eq(lensOrders.saleId, saleId)
    });

    // 4. Enrich Items with Lens Details
    const enrichedItems = (sale.items as any[]).map((item) => {
        // If item already has details, keep them
        if (item.lensDetails) return item;
        
        // If not, try to match with a lens order
        if (linkedLensOrders.length > 0) {
            // Simple heuristic: attach first order to first lens-like item
            const order = linkedLensOrders[0]; 
            if (order) {
                return {
                    ...item,
                    lensDetails: [
                        { eye: 'OD', sphere: order.sphereR, cylinder: order.cylindreR, axis: order.axeR, addition: order.additionR },
                        { eye: 'OG', sphere: order.sphereL, cylinder: order.cylindreL, axis: order.axeL, addition: order.additionL }
                    ].filter(d => (d.sphere || d.cylinder)) // Only valid details
                };
            }
        }
        return item;
    });

    const saleForPdf = { ...sale, items: enrichedItems };

    // 5. Prepare Data Package for Template
    // The template expects { document, client, settings, ... }
    // The generator will inject 'documentSettings' from resolution logic.
    // However, the template ALSO needs static 'settings' (profile) for address display.
    // The 'data' param in generateDocumentPDFStream is passed as 'data' prop to Template.
    // So 'data' passed to generator should be:
    const templateData = {
        document: saleForPdf,
        client: sale.client,
        settings: profile, // Static shop info (address, phone)
        // documentSettings will be injected by generator if we pass it, but generator passes it as separate prop?
        // Let's check generator...
        // Generator calls: React.createElement(PdfDocumentTemplate, { type, data, documentSettings: effectiveSettings })
        // So 'data' is passed as is.
    };

    // 6. Generate Stream
    const stream = await generateDocumentPDFStream({
        type: 'facture',
        data: templateData,
        shopId: profile.id,
        snapshot: sale.documentSettingsSnapshot,
        forceLatest,
    });
    
    // 7. Return Response
    // Convert Node stream to Web ReadableStream
    const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
    });

    // Dynamic Naming for PDF
    const safeFilename = generateDocumentFilename(
        "Facture",
        sale.saleNumber || String(sale.id),
        sale.clientName || sale.client?.fullName || 'Client'
    );

    return new NextResponse(readable, {
        headers: buildPdfHeaders(safeFilename),
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
