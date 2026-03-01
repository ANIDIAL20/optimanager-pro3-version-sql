// SECURED: uses authGuard + tenant filter (2026-03-01)
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { updateDocumentSettingsSchema } from '@/lib/validations/document-settings';
import { getDocumentSettings, updateDocumentSettings } from '@/lib/services/document-settings';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { shopId: rawShopId } = await params;
    const shopId = Number(rawShopId);
    
    console.log('[API_DEBUG] GET /document-settings raw:', rawShopId, 'parsed:', shopId);

    if (!Number.isFinite(shopId)) {
        return new NextResponse(`Invalid shopId param: ${rawShopId}`, { status: 400 });
    }

    const profile = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.id, shopId),
    });

    if (!profile) {
      return new NextResponse('Shop not found', { status: 404 });
    }

    // Authorization check: ensure user owns the shop
    if (profile.userId !== session.user.id) {
       return new NextResponse('Forbidden', { status: 403 });
    }

    const settings = await getDocumentSettings(shopId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[DOCUMENT_SETTINGS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    // 1. Auth Check - Early return
    const session = await auth();
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { shopId: rawShopId } = await params;
    const shopId = Number(rawShopId);

     // Ensure shopId is a valid number
    if (!Number.isFinite(shopId)) {
        console.error('[DOCUMENT_SETTINGS] Invalid shopId:', rawShopId);
        return new NextResponse(`Invalid shop ID: ${rawShopId}`, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateDocumentSettingsSchema.safeParse(body);
    if (!parsed.success) {
      // ✅ UPDATED
      return NextResponse.json(
        {
          error: 'Validation échouée',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Fetch current profile to check ownership and get version
    const profile = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.id, shopId),
    });

    if (!profile) {
      return new NextResponse('Shop not found', { status: 404 });
    }

    if (profile.userId !== session.user.id) {
       return new NextResponse('Forbidden', { status: 403 });
    }

    const updated = await updateDocumentSettings(shopId, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[DOCUMENT_SETTINGS_PATCH]', error);
    return new NextResponse((error as Error).message, { status: 500 });
  }
}
