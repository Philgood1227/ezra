import { getCurrentProfile } from "@/lib/auth/current-profile";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FamilyMemberSummary } from "@/lib/day-templates/types";

export interface ChildProfileRef {
  id: string;
  displayName: string;
  familyId: string;
}

export async function getFamilyMembersForCurrentFamily(): Promise<FamilyMemberSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return [
      {
        id: "dev-parent-id",
        displayName: "Parent Demo",
        role: "parent",
      },
      {
        id: "dev-child-id",
        displayName: "Ezra",
        role: "child",
      },
    ];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("family_id", context.familyId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    role: profile.role,
  }));
}

export async function getPrimaryChildProfileForCurrentFamily(): Promise<ChildProfileRef | null> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  if (context.role === "child" && context.profile) {
    return {
      id: context.profile.id,
      displayName: context.profile.display_name,
      familyId: context.familyId,
    };
  }

  if (!isSupabaseEnabled()) {
    return {
      id: "dev-child-id",
      displayName: "Ezra",
      familyId: context.familyId,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, family_id")
    .eq("family_id", context.familyId)
    .eq("role", "child")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    displayName: data.display_name,
    familyId: data.family_id,
  };
}
