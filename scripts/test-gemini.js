/**
 * Standalone Gemini Model Test Script
 * Purpose: Find which Gemini models work with your API Key
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function testGeminiModels() {
    console.log('🔍 Testing Gemini API Models...\n');

    // Get API key from environment
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
        console.error('❌ ERROR: GOOGLE_API_KEY not found in .env.local!');
        console.log('💡 Please add your API key to .env.local:');
        console.log('   GOOGLE_API_KEY=AIzaSy......\n');
        process.exit(1);
    }

    console.log('✅ API Key found');
    console.log(`   Starts with: ${API_KEY.substring(0, 10)}...`);
    console.log(`   Length: ${API_KEY.length} characters\n`);

    const genAI = new GoogleGenerativeAI(API_KEY);

    // List of models to try (prioritizing Gemini 2.0 models)
    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash-001",
        "gemini-flash-latest",
        "gemini-pro-latest"
    ];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const modelName of modelsToTry) {
        console.log(`👉 Testing model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const startTime = Date.now();
            const result = await model.generateContent("Say 'Test successful' in one word.");
            const response = await result.response;
            const duration = Date.now() - startTime;

            console.log(`✅✅✅ SUCCESS! Model "${modelName}" is working! (${duration}ms)`);
            console.log(`   Response: ${response.text()}\n`);

            // Found a working model, suggest using it
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎉 RECOMMENDATION: Use this model in your code:');
            console.log(`   const model = genAI.getGenerativeModel({ model: "${modelName}" });\n`);
            return modelName; // Return the working model

        } catch (error) {
            if (error.message.includes("404")) {
                console.log(`❌ ${modelName}: Not found (404)\n`);
            } else if (error.message.includes("API_KEY")) {
                console.log(`❌ ${modelName}: API Key invalid\n`);
                console.error('🛑 Your API key appears to be invalid. Get a new one at:');
                console.error('   https://makersuite.google.com/app/apikey\n');
                break;
            } else {
                console.log(`❌ ${modelName}: Error - ${error.message}\n`);
            }
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ No working models found!');
    console.log('💡 Possible issues:');
    console.log('   1. API key is invalid or expired');
    console.log('   2. Models not available in your region');
    console.log('   3. API key needs proper permissions\n');
}

testGeminiModels().catch(console.error);
