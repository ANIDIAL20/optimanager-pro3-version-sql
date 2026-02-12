// src/app/api/prescriptions/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { visionModel } from '@/lib/gemini';
import { validatePrescription, roundToQuarter, type PrescriptionData } from '@/lib/prescription-validator';
import { auth } from '@/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }
    
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Image requise' }, { status: 400 });
    }
    
    // Nettoyer le base64 s'il contient le préfixe data:image/...
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    console.log('🚀 [DEBUG-MARKER-V2] Prescription API Route called');
    console.log('📸 Processing prescription... Base64 length:', cleanBase64.length);
    
    const prompt = `Tu es un expert en lecture d'ordonnances optiques.

Extrais avec précision:

**OD (Œil Droit):**
- SPH: -20 à +20
- CYL: -6 à +6
- AXIS: 0-180 (si CYL existe)
- ADD: 0 à +4

**OS (Œil Gauche):**
- Mêmes paramètres

**PD:** 50-80 mm

**Optionnel:**
- doctorName
- date (YYYY-MM-DD)

**Règles:**
- Si valeur illisible → null (pas 0)
- Si CYL = 0 → AXIS = null
- Valeurs en multiples de 0.25

**Format JSON uniquement:**
\`\`\`json
{
  "OD": { "sph": -2.00, "cyl": -0.50, "axis": 180, "add": 1.50 },
  "OS": { "sph": -1.75, "cyl": -0.25, "axis": 10, "add": 1.50 },
  "PD": 63,
  "doctorName": "Dr. X",
  "date": "2026-02-11"
}
\`\`\`

Si pas ordonnance valide:
\`\`\`json
{ "error": "Image non valide" }
\`\`\``;

    console.log(`📸 Image processing start: ${imageBase64.length} bytes`);

    // Retry logic
    let result;
    let retries = 3;
    
    while (retries > 0) {
      try {
        console.log(`🤖 Gemini API Call (Attempt ${4-retries})...`);
        result = await visionModel.generateContent([
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
        ]);
        break;
      } catch (error: any) {
        console.error(`❌ Attempt ${4-retries} failed:`, error.message);
        
        // Handle network errors (fetch failed)
        if (error.message?.includes('fetch failed')) {
          console.error('🌐 CONNECTION ERROR: The server cannot reach Google APIs. This may be a temporary network issue or IPv6 DNS problem.');
        }

        if (error.status === 429 && retries > 1) {
          console.warn(`⚠️ Rate limited. Waiting ${4 - retries}s before retry...`);
          await new Promise(r => setTimeout(r, 2000 * (4 - retries)));
          retries--;
          continue;
        }
        throw error;
      }
    }
    
    if (!result) throw new Error('No response from Gemini');
    
    const text = result.response.text();
    console.log('🤖 Gemini response:', text.substring(0, 200));
    
    // Parse JSON
    let data: PrescriptionData;
    try {
      const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const jsonText = jsonMatch[1] || jsonMatch[0];
      data = JSON.parse(jsonText);
      
      if ('error' in data) {
        return NextResponse.json({ 
          success: false, 
          error: (data as any).error,
          confidence: 'none'
        }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ 
        success: false, 
        error: 'Impossible de lire l\'ordonnance',
        confidence: 'none'
      }, { status: 500 });
    }
    
    // Round values
    data.OD.sph = roundToQuarter(data.OD.sph);
    data.OD.cyl = roundToQuarter(data.OD.cyl);
    data.OD.add = roundToQuarter(data.OD.add);
    data.OS.sph = roundToQuarter(data.OS.sph);
    data.OS.cyl = roundToQuarter(data.OS.cyl);
    data.OS.add = roundToQuarter(data.OS.add);
    
    if (data.PD !== null) {
      data.PD = Math.round(data.PD * 2) / 2;
    }
    
    const validation = validatePrescription(data);
    
    const hasAllValues = data.OD.sph !== null && data.OS.sph !== null;
    const confidence = validation.isValid && hasAllValues ? 'high' 
                     : validation.isValid ? 'medium' 
                     : 'low';
    
    return NextResponse.json({
      success: true,
      data,
      validation,
      confidence,
      message: confidence === 'high' ? 'Ordonnance lue avec succès' : 'Veuillez vérifier les valeurs'
    });
    
  } catch (error: any) {
    console.error('❌ OCR error details:', {
      status: error.status,
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    if (error.status === 429) {
      return NextResponse.json({ 
        success: false, 
        error: 'Trop de requêtes. Réessayez dans quelques secondes.' 
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `[V2.1-1.5Flash] Erreur lors de la lecture: ${error.message}` 
    }, { status: 500 });
  }
}
