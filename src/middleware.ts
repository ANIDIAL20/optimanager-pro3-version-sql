import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const session = request.cookies.get("session")?.value;
    const { pathname } = request.nextUrl;

    // Protect /admin and /dashboard routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
        if (!session) {
            // Redirect to login if no session is present
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/dashboard/:path*"],
};
