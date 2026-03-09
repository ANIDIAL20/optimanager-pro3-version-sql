import { db } from '@/db';
import { supplierOrders, shopProfiles } from '@/db/schema';
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
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }

    const order = await db.query.supplierOrders.findFirst({
        where: and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, session.user.id)),
        with: {
            supplier: true
        }
    });

    if (!order) {
        return new NextResponse('Order not found', { status: 404 });
    }

    const profile = await db.query.shopProfiles.findFirst({
        where: eq(shopProfiles.userId, session.user.id)
    });

    if (!profile) {
        return new NextResponse('Shop Profile not found', { status: 404 });
    }

    const templateData = {
        document: {
            ...order,
            documentNumber: order.orderNumber || String(order.id),
            date: order.createdAt,
            items: order.items || [],
            totalTTC: Number(order.montantTotal || 0),
            totalHT: Number(order.montantTotal || 0) / 1.2, // Rough estimate
        },
        client: {
            fullName: order.supplier?.nom || order.fournisseur || 'Fournisseur',
            phone: order.supplier?.phone || order.supplierPhone,
        },
        settings: profile,
    };

    const stream = await generateDocumentPDFStream({
        type: 'bc', // Bon de Commande
        data: templateData,
        shopId: profile.id,
    });
    
    const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
    });

    const safeFilename = generateDocumentFilename(
        "Commande",
        order.orderNumber || String(order.id),
        order.supplier?.nom || order.fournisseur || 'Fournisseur'
    );

    return new NextResponse(readable, {
        headers: buildPdfHeaders(safeFilename),
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
