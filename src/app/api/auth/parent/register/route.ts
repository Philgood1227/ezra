import { type NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/schemas";
import { getDevParentSessionCookie } from "@/lib/auth/dev-session";
import { getProfileByUserId } from "@/lib/auth/role";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { jsonWithCookies } from "../../_utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (!isSupabaseEnabled()) {
    const response = NextResponse.json({ redirectTo: "/parent-v2/dashboard" });
    const devCookie = getDevParentSessionCookie();
    response.cookies.set(devCookie.name, devCookie.value, devCookie.options);
    return response;
  }

  const { response, supabase } = createSupabaseRouteClient(request);
  const { familyName, displayName, email, password } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        family_name: familyName,
        role: "parent",
      },
    },
  });

  if (error) {
    return jsonWithCookies(response, { error: error.message }, { status: 400 });
  }

  if (data.user && data.session) {
    const profile = await getProfileByUserId(supabase, data.user.id);
    if (profile?.role === "child") {
      return jsonWithCookies(response, { redirectTo: "/child" });
    }
    return jsonWithCookies(response, { redirectTo: "/parent-v2/dashboard" });
  }

  return jsonWithCookies(response, {
    message: "Compte créé. Confirmez votre email, puis connectez-vous.",
    redirectTo: "/auth/login",
  });
}
