// src/lib/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function notConfigured(): never {
  throw new Error('❌ GEMINI_API_KEY is missing');
}

// ✅ For text (prescriptions text extraction)
export const textModel = genAI
  ? genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    })
  : ({
      generateContent: async () => notConfigured(),
    } as any);

// ✅ For images (invoice scanning)
export const visionModel = genAI
  ? genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    })
  : ({
      generateContent: async () => notConfigured(),
    } as any);

// Aliases
export const invoiceModel = visionModel;
export const prescriptionModel = visionModel;

console.log('✅ Gemini initialized:', {
  text: 'gemini-pro',
  vision: 'gemini-pro-vision'
});
