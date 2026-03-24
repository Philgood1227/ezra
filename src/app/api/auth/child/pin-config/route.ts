import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { pinConfigSchema } from "@/features/auth/schemas";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { hashPin } from "@/lib/auth/pin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";

function buildManagedChildEmail(childName: string): string {
  const slug = childName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `child.${slug || "profile"}.${Date.now()}.${randomUUID().slice(0, 8)}@child.ezra.local`;
}

function buildManagedChildPassword(): string {
  return `EzraChild!${randomUUID()}${Date.now()}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = pinConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const context = await getCurrentProfile();
  if (context.role !== "parent") {
    return NextResponse.json(
      { error: "Seuls les parents peuvent configurer les PIN enfants." },
      { status: 403 },
    );
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      message: "Mode démo actif. Le PIN enfant accepté est 1234.",
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY est requis pour configurer le PIN enfant." },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  const childName = parsed.data.childName.trim();
  const pinHash = hashPin(parsed.data.pin);

  const { data: rows, error: childLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", context.familyId!)
    .eq("role", "child")
    .ilike("display_name", childName)
    .limit(1);

  if (childLookupError) {
    return NextResponse.json(
      { error: "Impossible de charger les profils enfants pour le moment." },
      { status: 500 },
    );
  }

  let childId = rows?.[0]?.id ?? null;
  let createdNewChildProfile = false;

  if (!childId) {
    const managedChildEmail = buildManagedChildEmail(childName);
    const managedChildPassword = buildManagedChildPassword();
    const { data: createdUserData, error: createAuthUserError } = await admin.auth.admin.createUser({
      email: managedChildEmail,
      password: managedChildPassword,
      email_confirm: true,
      user_metadata: {
        role: "child",
        display_name: childName,
        family_id: context.familyId,
        parent_managed: true,
      },
    });

    const createdUserId = createdUserData.user?.id;
    if (createAuthUserError || !createdUserId) {
      return NextResponse.json(
        { error: "Impossible de créer le compte enfant pour le moment." },
        { status: 500 },
      );
    }

    const { error: insertProfileError } = await admin.from("profiles").insert({
      id: createdUserId,
      family_id: context.familyId!,
      display_name: childName,
      role: "child",
      pin_hash: pinHash,
    });

    if (insertProfileError) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      return NextResponse.json(
        { error: "Impossible de créer le profil enfant pour le moment." },
        { status: 500 },
      );
    }

    childId = createdUserId;
    createdNewChildProfile = true;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ pin_hash: pinHash })
    .eq("id", childId)
    .eq("family_id", context.familyId!);

  if (updateError) {
    return NextResponse.json(
      { error: `Impossible d'enregistrer le PIN enfant pour le moment. (${updateError.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: createdNewChildProfile
      ? "Profil enfant créé et PIN enregistré."
      : "PIN enfant mis à jour.",
  });
}
