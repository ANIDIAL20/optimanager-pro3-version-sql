import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: 'Image manquante' },
                { status: 400 }
            );
        }

        // Clean base64 if needed
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Convert base64 to buffer for Tesseract
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Perform OCR with Tesseract.js
        // Languages: Arabic + French + English
        const { data } = await Tesseract.recognize(
            buffer,
            'ara+fra+eng',
            {
                logger: (m) => {
                    // Optional: log progress
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );

        return NextResponse.json({
            success: true,
            text: data.text
        });

    } catch (error: any) {
        console.error('OCR Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Échec de l\'OCR' },
            { status: 500 }
        );
    }
}
