// check-google-models.js
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY غير موجود في .env.local");
        return;
    }

    // استخدمنا v1beta لأنه هو المستخدم في SDK افتراضياً
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        console.log("\n✅ الموديلات المتاحة لك (Available Models):");
        console.log("---------------------------------------------");

        const viableModels = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", "")); // نحذف البادئة

        console.log(viableModels.join("\n"));

        console.log("\n👉 اختر اسماً من القائمة أعلاه وضعه في route.ts");

    } catch (error) {
        console.error("❌ خطأ في الاتصال:", error);
    }
}

main();