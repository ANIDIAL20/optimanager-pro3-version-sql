import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json(
                { success: false, error: 'Texte manquant' },
                { status: 400 }
            );
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'GROQ_API_KEY manquante' },
                { status: 500 }
            );
        }

        // Call Groq text-only LLM
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un assistant expert en analyse de factures. Tu reçois du texte OCR (potentiellement bruyant) extrait d'une facture. 
          
Extrait les informations suivantes et renvoie UNIQUEMENT un objet JSON valide (sans commentaire, sans markdown):

{
  "invoiceNumber": "numéro de facture ou null",
  "date": "date au format YYYY-MM-DD ou null",
  "vendor": "nom du fournisseur ou null",
  "total": nombre (montant total) ou null,
  "currency": "devise (EUR, MAD, etc.) ou null",
  "products": [
    {
      "name": "nom du produit",
      "quantity": nombre ou null,
      "unitPrice": nombre ou null,
      "total": nombre ou null
    }
  ]
}

Si une information n'est pas trouvée, utilise null. Si le texte ne ressemble pas à une facture, renvoie un objet vide avec tous les champs à null.`
                },
                {
                    role: 'user',
                    content: `Voici le texte OCR de la facture:\n\n${text}`
                }
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
            throw new Error('Pas de réponse du modèle');
        }

        // Parse JSON safely
        let data;
        try {
            data = JSON.parse(content);
        } catch (e) {
            // Fallback: try to clean markdown if present
            const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
            data = JSON.parse(cleaned);
        }

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error: any) {
        console.error('Invoice AI Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Échec de l\'analyse automatique' },
            { status: 500 }
        );
    }
}
