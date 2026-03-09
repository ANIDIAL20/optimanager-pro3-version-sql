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

    const sale = await db.query.sales.findFirst({
        where: and(eq(sales.id, saleId), eq(sales.userId, session.user.id)),
        with: {
            client: true
        }
    });

    if (!sale) {
        return new NextResponse('Receipt not found', { status: 404 });
    }

    const profile = await db.query.shopProfiles.findFirst({
        where: eq(shopProfiles.userId, session.user.id)
    });

    if (!profile) {
        return new NextResponse('Shop Profile not found', { status: 404 });
    }

    const templateData = {
        document: sale,
        client: sale.client,
        settings: profile,
    };

    const stream = await generateDocumentPDFStream({
        type: 'recu',
        data: templateData,
        shopId: profile.id,
        snapshot: sale.documentSettingsSnapshot,
        forceLatest,
    });
    
    const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
    });

    const safeFilename = generateDocumentFilename(
        "Recu",
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
