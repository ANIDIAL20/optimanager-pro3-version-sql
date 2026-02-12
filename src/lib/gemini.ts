// src/lib/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('❌ GEMINI_API_KEY is missing');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ For text (prescriptions text extraction)
export const textModel = genAI.getGenerativeModel({ 
  model: "models/gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 2048
  }
});

// ✅ For images (invoice scanning)
export const visionModel = genAI.getGenerativeModel({ 
  model: "models/gemini-2.5-flash", 
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 2048
  }
});

// Aliases
export const invoiceModel = visionModel;
export const prescriptionModel = visionModel;

console.log('✅ Gemini initialized:', {
  text: 'gemini-pro',
  vision: 'gemini-pro-vision'
});
