import { db } from '@/db';
import { devis, shopProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { generateDocumentPDFStream } from '@/lib/pdf-generator';

export const runtime = 'nodejs';

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
    const documentId = parseInt(id);
    
    if (isNaN(documentId)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }

    // 1. Fetch Quote (Devis)
    const quote = await db.query.devis.findFirst({
        where: and(eq(devis.id, documentId), eq(devis.userId, session.user.id)),
        with: {
            client: true 
        }
    });

    if (!quote) {
        return new NextResponse('Devis not found', { status: 404 });
    }

    // 2. Fetch Shop Profile
    const profile = await db.query.shopProfiles.findFirst({
        where: eq(shopProfiles.userId, session.user.id)
    });

    if (!profile) {
        return new NextResponse('Shop Profile not found', { status: 404 });
    }

    // 3. Prepare Data
    const clientData = quote.client || {
        fullName: quote.clientName,
        phone: quote.clientPhone
    };

    const templateData = {
        document: quote,
        client: clientData,
        settings: profile, // Static shop info
        // documentSettings will be resolved by generator
    };

    // 4. Generate Stream
    const stream = await generateDocumentPDFStream({
        type: 'devis',
        data: templateData,
        shopId: profile.id, // Use profile.id as shopId
        snapshot: quote.documentSettingsSnapshot
    });
    
    // 5. Return Response
    // Convert Node stream to Web ReadableStream
    const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
    });

    return new NextResponse(readable, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="devis-${quote.id}.pdf"`,
        },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
