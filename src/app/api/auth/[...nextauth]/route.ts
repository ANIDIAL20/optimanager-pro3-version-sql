// @ts-nocheck
import { handlers } from "@/auth";

export const GET = async (req: Request) => {
    console.log("🔍 DEBUG: GET /api/auth HIT");
    console.log("handlers keys:", Object.keys(handlers || {}));
    if (!handlers?.GET) {
        console.error("❌ Handlers.GET is undefined!");
        return new Response("Handlers undefined", { status: 500 });
    }
    return handlers.GET(req);
}

export const POST = async (req: Request) => {
    console.log("🔍 DEBUG: POST /api/auth HIT");
    return handlers.POST(req);
}
