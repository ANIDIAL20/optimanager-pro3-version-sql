// src/app/api/invoice-ai/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { scanInvoiceWithGemini } from '@/lib/gemini-direct';
import { validateInvoiceData } from '@/lib/invoice-validator';
import { logSuccess, logFailure } from '@/lib/audit-log';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId = 'system';
  
  try {
    console.log('📥 Invoice scan request received');
    
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error('❌ Unauthorized request');
      return NextResponse.json({ 
        success: false, 
        error: 'Non autorisé' 
      }, { status: 401 });
    }
    userId = session.user.id;
    console.log('✅ User authenticated:', userId);
    
    // 2. Get image
    const body = await req.json();
    const { imageBase64 } = body;
    
    if (!imageBase64) {
      console.error('❌ No image provided');
      return NextResponse.json({ 
        success: false, 
        error: 'Image requise' 
      }, { status: 400 });
    }
    
    console.log('📸 Image received, size:', imageBase64.length, 'chars');
    
    // 3. Call Gemini (Direct REST API)
    console.log('🚀 Calling Gemini API (Direct REST)...');
    
    const text = await scanInvoiceWithGemini(imageBase64);
    
    console.log('✅ Gemini response received');
    
    // 4. Parse JSON response
    let jsonData;
    
    try {
      jsonData = JSON.parse(text);
      console.log('✅ Direct JSON parse successful');
    } catch (e) {
      console.warn('⚠️ Direct parse failed, trying extraction...');
      const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/) || 
                       text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Format JSON invalide dans la réponse');
      }
      
      const jsonText = jsonMatch[1] || jsonMatch[0];
      jsonData = JSON.parse(jsonText);
    }
    
    // 5. Check for error response
    if ('error' in jsonData) {
      return NextResponse.json({ 
        success: false, 
        error: jsonData.error 
      }, { status: 400 });
    }
    
    // 6. Validate extracted data
    const validation = validateInvoiceData(jsonData);
    const duration = Date.now() - startTime;

    // 7. Audit Log (No binary/image stored)
    await logSuccess(userId, 'INVOICE_SCAN', 'AI_SCAN', jsonData.invoiceNumber || 'unknown', {
        supplierName: jsonData.supplierName,
        productCount: jsonData.products?.length || 0,
        duration
    }).catch(err => console.error('Failed to log audit:', err));
    
    return NextResponse.json({
      success: true,
      data: jsonData,
      validation,
      stats: {
        model: 'gemini-direct-rest',
        duration
      }
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('💥 Invoice scan error:', error.message);
    
    await logFailure(userId, 'INVOICE_SCAN', 'AI_SCAN', error.message, 'error', duration)
      .catch(err => console.error('Failed to log failure:', err));
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erreur lors du scan de la facture'
    }, { status: 500 });
  }
}
