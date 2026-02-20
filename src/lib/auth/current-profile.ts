import { cookies } from "next/headers";
import { CHILD_SESSION_COOKIE, DEV_PARENT_SESSION_COOKIE } from "@/lib/auth/constants";
import { parseChildSessionToken } from "@/lib/auth/child-session";
import { isDevParentSession } from "@/lib/auth/dev-session";
import type { ProfileRow, ResolvedAuthContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fromChildToken(payload: {
  profileId: string;
  familyId: string;
  displayName: string;
}): ProfileRow {
  return {
    id: payload.profileId,
    family_id: payload.familyId,
    display_name: payload.displayName,
    role: "child",
    avatar_url: null,
    pin_hash: null,
    created_at: new Date().toISOString(),
  };
}

async function resolveSupabaseProfile(): Promise<ResolvedAuthContext | null> {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return {
    role: profile.role,
    profile,
    familyId: profile.family_id,
    source: "supabase",
  };
}

async function resolveChildSession(): Promise<ResolvedAuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHILD_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = parseChildSessionToken(token);
  if (!payload) {
    return null;
  }

  if (!isSupabaseEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const profile = fromChildToken(payload);
    return {
      role: "child",
      profile,
      familyId: profile.family_id,
      source: "child-pin",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", payload.profileId)
    .eq("role", "child")
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    role: "child",
    profile,
    familyId: profile.family_id,
    source: "child-pin",
  };
}

async function resolveDevParentCookie(): Promise<ResolvedAuthContext | null> {
  if (isSupabaseEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DEV_PARENT_SESSION_COOKIE)?.value;

  if (!isDevParentSession(cookieValue)) {
    return null;
  }

  return {
    role: "parent",
    familyId: "dev-family-id",
    profile: {
      id: "dev-parent-id",
      family_id: "dev-family-id",
      display_name: "Parent Démo",
      role: "parent",
      avatar_url: null,
      pin_hash: null,
      created_at: new Date().toISOString(),
    },
    source: "dev-parent-cookie",
  };
}

export async function getCurrentProfile(): Promise<ResolvedAuthContext> {
  const supabaseContext = await resolveSupabaseProfile();
  if (supabaseContext) {
    return supabaseContext;
  }

  const childContext = await resolveChildSession();
  if (childContext) {
    return childContext;
  }

  const devParentContext = await resolveDevParentCookie();
  if (devParentContext) {
    return devParentContext;
  }

  return {
    role: "anonymous",
    profile: null,
    familyId: null,
    source: "none",
  };
}
