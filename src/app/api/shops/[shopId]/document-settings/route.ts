import { NextResponse } from 'next/server';
import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_DOCUMENT_SETTINGS, DocumentSettings } from '@/lib/document-settings';
import { auth } from '@/auth';

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

    const startSettings = profile.documentSettings as DocumentSettings || DEFAULT_DOCUMENT_SETTINGS;
    
    // Ensure defaults are merged if missing
    const mergedSettings = {
        ...DEFAULT_DOCUMENT_SETTINGS,
        ...startSettings,
        default: {
            ...DEFAULT_DOCUMENT_SETTINGS.default,
            ...(startSettings.default || {})
        }
    };

    return NextResponse.json(mergedSettings);
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
    
    // Validate body structure (basic validation)
    if (!body || typeof body !== 'object') {
       return new NextResponse('Invalid body', { status: 400 });
    }

    const { default: defaults } = body;
    if (defaults) {
        // Validate booleans to prevent "indeterminate" state or wrong types
        const booleanFields = ['showLogo', 'showFooter', 'showAddress', 'showPhone', 'showEmail', 'showIce', 'showRib', 'showRc'];
        for (const field of booleanFields) {
            if (defaults[field] !== undefined && typeof defaults[field] !== 'boolean') {
                return new NextResponse(`Invalid field 'default.${field}': must be a boolean (true/false)`, { status: 400 });
            }
        }
    }

    // Fetch current profile to check ownership and get version
    const profile = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.id, parseInt(shopId)),
    });

    if (!profile) {
      return new NextResponse('Shop not found', { status: 404 });
    }

    if (profile.userId !== session.user.id) {
       return new NextResponse('Forbidden', { status: 403 });
    }

    const newVersion = (profile.documentSettingsVersion || 0) + 1;
    
    // Ensure we keep the version in the settings object consistent
    const newSettings = {
        ...body,
        version: newVersion,
    };

    await db.update(shopProfiles)
      .set({
        documentSettings: newSettings,
        documentSettingsVersion: newVersion,
        documentSettingsUpdatedAt: new Date(),
      })
      .where(eq(shopProfiles.id, parseInt(shopId)));

    return NextResponse.json(newSettings);
  } catch (error) {
    console.error('[DOCUMENT_SETTINGS_PATCH]', error);
    return new NextResponse((error as Error).message, { status: 500 });
  }
}
