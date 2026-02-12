// src/lib/gemini-direct.ts

/**
 * Direct REST API call to Gemini (bypasses SDK issues)
 * Tries multiple models until one works
 */
export async function scanInvoiceWithGemini(imageBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  
  const prompt = `Tu es un extracteur de données. Lis uniquement le tableau de lignes produits.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte).

Schéma:
{
  "invoiceNumber": string|null,
  "supplierName": string|null,
  "date": "YYYY-MM-DD"|null,
  "products": [
    {
      "reference": string,
      "name": string|null,
      "quantity": number|null,
      "unitPrice": number|null,
      "brand": string|null,
      "category": string|null
    }
  ]
}

Règles STRICTES:
1) 1 élément dans "products" = 1 LIGNE du tableau (NE JAMAIS regrouper/merge).
2) "quantity" doit venir UNIQUEMENT de la colonne QTE/Quantité. Ne jamais déduire à partir de marques, surlignages, numéros de ligne, ou répétitions.
3) "reference" doit venir UNIQUEMENT de la colonne REF/Code, exactement.
4) Si un champ n’existe pas ou est illisible: mettre null (ne pas inventer).
5) Ne pas additionner les quantités. Ne pas estimer.`;

  // Liste des models disponibles (Mise à jour suite au scan des IDs valides)
  const modelsToTry = [
    'gemini-2.5-flash', // ✅ User requested & Available
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest' // Fallback to whatever is 'latest' alias
  ];
  
  let lastError: any = null;
  
    // Nettoyer le base64 s'il contient le préfixe data:image/...
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // Essayer chaque model
    for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Trying model: ${modelName}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 8192
          }
        })
      });
      
      const data = await response.json();
      
      // Check for errors
      if (!response.ok) {
        const errorMsg = data.error?.message || 'Unknown error';
        console.warn(`❌ ${modelName} failed:`, errorMsg);
        lastError = new Error(`${modelName}: ${errorMsg}`);
        continue; // Try next model
      }
      
      // Extract response text
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.warn(`❌ ${modelName}: No text in response`);
        lastError = new Error(`${modelName}: No text in response`);
        continue;
      }
      
      console.log(`✅ Success with model: ${modelName}`);
      console.log(`📝 Response length: ${text.length} characters`);
      
      return text;
      
    } catch (error: any) {
      console.error(`❌ ${modelName} exception:`, error.message);
      lastError = error;
      continue; // Try next model
    }
  }
  
  // All models failed
  console.error('💥 All models failed!');
  throw lastError || new Error('All Gemini models failed. Please check your API key and internet connection.');
}
