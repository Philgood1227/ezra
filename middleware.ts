import { NextResponse, type NextRequest } from "next/server";
import { CHILD_SESSION_COOKIE, DEV_PARENT_SESSION_COOKIE } from "@/lib/auth/constants";
import { updateSession } from "@/lib/supabase/middleware";

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));
}

function withResponseCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const response = await updateSession(request);

  if (pathname.startsWith("/parent")) {
    const hasParentAccess =
      hasSupabaseSessionCookie(request) ||
      Boolean(request.cookies.get(DEV_PARENT_SESSION_COOKIE)?.value);

    if (!hasParentAccess) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.search = "";
      return withResponseCookies(response, NextResponse.redirect(loginUrl));
    }
  }

  if (pathname.startsWith("/child")) {
    const hasChildAccess =
      Boolean(request.cookies.get(CHILD_SESSION_COOKIE)?.value) ||
      hasSupabaseSessionCookie(request);

    if (!hasChildAccess) {
      const pinUrl = request.nextUrl.clone();
      pinUrl.pathname = "/auth/pin";
      pinUrl.search = "";
      return withResponseCookies(response, NextResponse.redirect(pinUrl));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*|icons|api).*)"],
};
