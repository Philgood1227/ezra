"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  creditDemoRewardStars,
  deleteDemoRewardTier,
  upsertDemoRewardTier,
} from "@/lib/demo/gamification-store";
import { getTodayDateKey } from "@/lib/day-templates/date";
import type { ActionResult, RewardTierInput } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const rewardTierSchema = z.object({
  label: z.string().trim().min(2, "Le nom de la recompense est obligatoire."),
  description: z.string().trim().max(200).nullable(),
  pointsRequired: z.number().int().min(0).max(9999),
  sortOrder: z.number().int().min(0).max(999),
});

const creditChildStarsSchema = z.object({
  childProfileId: z.string().uuid("Profil enfant invalide."),
  starsToAdd: z.number().int().min(1, "Minimum 1 etoile.").max(9999, "Maximum 9999 etoiles."),
});

async function requireParentFamilyId(): Promise<string | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  return context.familyId;
}

function revalidateRewardsPaths(): void {
  revalidatePath("/parent/rewards");
  revalidatePath("/parent-v2/rewards");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/missions");
  revalidatePath("/child/my-day");
}

export async function createRewardTierAction(
  input: RewardTierInput,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = rewardTierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const created = upsertDemoRewardTier(familyId, { ...parsed.data });
    revalidateRewardsPaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reward_tiers")
    .insert({
      family_id: familyId,
      label: parsed.data.label,
      description: parsed.data.description,
      points_required: parsed.data.pointsRequired,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la recompense pour le moment." };
  }

  revalidateRewardsPaths();
  return { success: true, data: { id: data.id } };
}

export async function updateRewardTierAction(
  rewardTierId: string,
  input: RewardTierInput,
): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = rewardTierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoRewardTier(familyId, { id: rewardTierId, ...parsed.data });
    revalidateRewardsPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reward_tiers")
    .update({
      label: parsed.data.label,
      description: parsed.data.description,
      points_required: parsed.data.pointsRequired,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", rewardTierId)
    .eq("family_id", familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier cette recompense." };
  }

  revalidateRewardsPaths();
  return { success: true };
}

export async function deleteRewardTierAction(rewardTierId: string): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoRewardTier(familyId, rewardTierId);
    if (!deleted) {
      return { success: false, error: "Recompense introuvable." };
    }
    revalidateRewardsPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reward_tiers")
    .delete()
    .eq("id", rewardTierId)
    .eq("family_id", familyId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette recompense." };
  }

  revalidateRewardsPaths();
  return { success: true };
}

export interface CreditChildStarsActionResult {
  childProfileId: string;
  starsAdded: number;
  availableStars: number;
}

export async function creditChildStarsAction(
  input: unknown,
): Promise<ActionResult<CreditChildStarsActionResult>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = creditChildStarsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const starsToAdd = Math.max(1, Math.trunc(parsed.data.starsToAdd));
  const dateKey = getTodayDateKey();

  if (!isSupabaseEnabled()) {
    const balance = creditDemoRewardStars(familyId, parsed.data.childProfileId, dateKey, starsToAdd);
    revalidateRewardsPaths();
    return {
      success: true,
      data: {
        childProfileId: parsed.data.childProfileId,
        starsAdded: starsToAdd,
        availableStars: balance.availableStars,
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: childProfile, error: childError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.childProfileId)
    .eq("family_id", familyId)
    .eq("role", "child")
    .maybeSingle();

  if (childError || !childProfile) {
    return { success: false, error: "Enfant introuvable dans cette famille." };
  }

  await supabase.from("daily_points").upsert(
    {
      family_id: familyId,
      child_profile_id: childProfile.id,
      date: dateKey,
      points_total: 0,
    },
    { onConflict: "child_profile_id,date", ignoreDuplicates: true },
  );

  const { data: currentDaily, error: currentDailyError } = await supabase
    .from("daily_points")
    .select("points_total")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfile.id)
    .eq("date", dateKey)
    .maybeSingle();

  if (currentDailyError) {
    return { success: false, error: "Impossible de crediter les etoiles." };
  }

  const nextTodayTotal = Math.max(0, Math.trunc(currentDaily?.points_total ?? 0) + starsToAdd);
  const { error: updateError } = await supabase
    .from("daily_points")
    .update({ points_total: nextTodayTotal })
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfile.id)
    .eq("date", dateKey);

  if (updateError) {
    return { success: false, error: "Impossible de crediter les etoiles." };
  }

  const [{ data: dailyRows, error: dailyError }, { data: claimRows, error: claimsError }] =
    await Promise.all([
      supabase
        .from("daily_points")
        .select("points_total")
        .eq("family_id", familyId)
        .eq("child_profile_id", childProfile.id),
      supabase
        .from("reward_claims")
        .select("points_spent")
        .eq("family_id", familyId)
        .eq("child_profile_id", childProfile.id),
    ]);

  if (dailyError || claimsError) {
    return { success: false, error: "Etoiles creditees, mais solde indisponible temporairement." };
  }

  const earnedStarsTotal = (dailyRows ?? []).reduce((total, row) => {
    return total + Math.max(0, Math.trunc(row.points_total ?? 0));
  }, 0);
  const spentStarsTotal = (claimRows ?? []).reduce((total, row) => {
    return total + Math.max(0, Math.trunc(row.points_spent ?? 0));
  }, 0);

  revalidateRewardsPaths();
  return {
    success: true,
    data: {
      childProfileId: childProfile.id,
      starsAdded: starsToAdd,
      availableStars: Math.max(0, earnedStarsTotal - spentStarsTotal),
    },
  };
}
