import { type NextRequest, NextResponse } from "next/server";
import { childPinSchema } from "@/features/auth/schemas";
import { createChildSessionToken, getChildSessionCookieOptions } from "@/lib/auth/child-session";
import { verifyPin } from "@/lib/auth/pin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = childPinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (!isSupabaseEnabled()) {
    if (parsed.data.pin !== "1234") {
      return NextResponse.json({ error: "PIN invalide." }, { status: 401 });
    }

    const token = createChildSessionToken({
      profileId: "dev-child-id",
      familyId: "dev-family-id",
      displayName: parsed.data.childName,
      role: "child",
    });

    const response = NextResponse.json({ redirectTo: "/child" });
    const cookieOptions = getChildSessionCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);
    return response;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY est requis pour la connexion enfant par PIN." },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: familyRows, error: familyError } = await admin
    .from("families")
    .select("id, name")
    .ilike("name", parsed.data.familyName)
    .limit(1);

  const family = familyRows?.[0];
  if (familyError || !family) {
    return NextResponse.json({ error: "Famille introuvable." }, { status: 404 });
  }

  const { data: children, error: childError } = await admin
    .from("profiles")
    .select("id, family_id, display_name, role, pin_hash")
    .eq("family_id", family.id)
    .eq("role", "child")
    .ilike("display_name", parsed.data.childName)
    .limit(1);

  const child = children?.[0];
  if (childError || !child || !child.pin_hash) {
    return NextResponse.json(
      { error: "Profil enfant introuvable ou PIN non configuré." },
      { status: 404 },
    );
  }

  const isValid = verifyPin(parsed.data.pin, child.pin_hash);
  if (!isValid) {
    return NextResponse.json({ error: "PIN invalide." }, { status: 401 });
  }

  const token = createChildSessionToken({
    profileId: child.id,
    familyId: child.family_id,
    displayName: child.display_name,
    role: "child",
  });
  const response = NextResponse.json({ redirectTo: "/child" });
  const cookieOptions = getChildSessionCookieOptions();
  response.cookies.set(cookieOptions.name, token, cookieOptions);
  return response;
}
