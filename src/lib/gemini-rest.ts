/**
 * Gemini REST API Helper
 * Direct implementation to bypass SDK/environment issues
 */

export async function scanInvoiceWithREST(imageBase64: string, prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }
  
    // Detect mimeType from base64 if possible
    let mimeType = "image/jpeg";
    const mimeMatch = imageBase64.match(/^data:([\w\/+-]+);base64,/);
    if (mimeMatch) {
        mimeType = mimeMatch[1];
    }
    
    // Clean base64
    const cleanBase64 = imageBase64.replace(/^data:[\w\/+-]+;base64,/, '');

    console.log(`🤖 Starting Gemini analysis via REST API (models/gemini-1.5-flash)`);

    // We use gemini-1.5-flash because gemini-pro-vision is deprecated and often throws 'Model not found'
    // 1.5-flash is faster, better for OCR, and has a 1500 req/day quota.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Gemini REST API Error Response:', JSON.stringify(errorData, null, 2));
        
        if (response.status === 404) {
            throw new Error(`Model gemini-1.5-flash not found. Please check if your API key has access to it.`);
        }
        
        throw new Error(errorData.error?.message || `API Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Unexpected Gemini response format:', JSON.stringify(data, null, 2));
        throw new Error('Format de réponse Gemini inattendu');
    }

    return data.candidates[0].content.parts[0].text;
}
