import { type NextRequest, NextResponse } from "next/server";
import { CHILD_SESSION_COOKIE, DEV_PARENT_SESSION_COOKIE } from "@/lib/auth/constants";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { jsonWithCookies } from "../../_utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    const response = NextResponse.json({ redirectTo: "/auth/login" });
    response.cookies.delete(DEV_PARENT_SESSION_COOKIE);
    response.cookies.delete(CHILD_SESSION_COOKIE);
    return response;
  }

  const { response, supabase } = createSupabaseRouteClient(request);
  await supabase.auth.signOut();
  const json = jsonWithCookies(response, { redirectTo: "/auth/login" });
  json.cookies.delete(CHILD_SESSION_COOKIE);
  return json;
}
