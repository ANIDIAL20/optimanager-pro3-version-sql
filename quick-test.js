
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function test() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log("Using key starting with:", key?.substring(0, 10));
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    console.log("Attempting fetch to gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Result:", result.response.text());
  } catch (e) {
    console.log("Error with gemini-1.5-flash:", e.message);
    
    console.log("\nAttempting fetch to gemini-flash-latest...");
    try {
        const modelLatest = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const resultLatest = await modelLatest.generateContent("Hello");
        console.log("Result Latest:", resultLatest.response.text());
    } catch (e2) {
        console.log("Error with gemini-flash-latest:", e2.message);
    }
  }
}

test();
