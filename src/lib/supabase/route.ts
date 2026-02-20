import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

interface RouteClientResult {
  response: NextResponse;
  supabase: SupabaseClient<Database>;
}

export function createSupabaseRouteClient(request: NextRequest): RouteClientResult {
  const { url, anonKey } = getSupabaseEnv();
  const response = NextResponse.next();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { response, supabase };
}
