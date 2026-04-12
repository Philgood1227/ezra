"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getTodayDateKey } from "@/lib/day-templates/date";
import type { ActionResult } from "@/lib/day-templates/types";
import { claimDemoReward } from "@/lib/demo/gamification-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const claimRewardSchema = z.object({
  rewardTierId: z.string().uuid("Recompense invalide."),
});

export interface ClaimRewardActionResult {
  rewardTierId: string;
  rewardLabel: string;
  pointsSpent: number;
  claimedAt: string;
  usageCount: number;
  spentToday: number;
  dailyPointsTotal: number;
  remainingStars: number;
}

function revalidateRewardPaths(): void {
  revalidatePath("/child");
  revalidatePath("/child/missions");
  revalidatePath("/parent/rewards");
  revalidatePath("/parent-v2/rewards");
  revalidatePath("/parent/dashboard");
}

export async function claimRewardAction(
  payload: unknown,
): Promise<ActionResult<ClaimRewardActionResult>> {
  const parsed = claimRewardSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role !== "child") {
    return { success: false, error: "Action reservee a l'enfant." };
  }

  const dateKey = getTodayDateKey();

  if (!isSupabaseEnabled()) {
    const claimed = claimDemoReward({
      familyId: context.familyId,
      childProfileId: context.profile.id,
      rewardTierId: parsed.data.rewardTierId,
      date: dateKey,
    });

    if (!claimed) {
      return { success: false, error: "Pas assez d'etoiles ou recompense introuvable." };
    }

    revalidateRewardPaths();
    return {
      success: true,
      data: {
        rewardTierId: claimed.rewardTierId,
        rewardLabel: claimed.rewardLabel,
        pointsSpent: claimed.pointsSpent,
        claimedAt: claimed.claimedAt,
        usageCount: claimed.usageCount,
        spentToday: claimed.spentToday,
        dailyPointsTotal: claimed.dailyPointsTotal,
        remainingStars: claimed.remainingStars,
      },
    };
  }

  const useAdmin =
    context.source === "child-pin" && context.role === "child" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = useAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  const { data: rewardTier, error: rewardTierError } = await supabase
    .from("reward_tiers")
    .select("id, family_id, label, points_required")
    .eq("id", parsed.data.rewardTierId)
    .maybeSingle();

  if (rewardTierError || !rewardTier || rewardTier.family_id !== context.familyId) {
    return { success: false, error: "Recompense introuvable." };
  }

  const [{ data: dailyPointsRows, error: dailyPointsError }, { data: claimRows, error: claimsError }] =
    await Promise.all([
      supabase
        .from("daily_points")
        .select("points_total")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", context.profile.id),
      supabase
        .from("reward_claims")
        .select("points_spent,claim_date")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", context.profile.id),
    ]);

  if (dailyPointsError) {
    return { success: false, error: "Impossible de verifier tes etoiles." };
  }

  if (claimsError) {
    return { success: false, error: "Impossible de verifier tes echanges." };
  }

  const dailyPointsTotal = (dailyPointsRows ?? []).reduce((total, row) => {
    return total + Math.max(0, Math.trunc(row.points_total ?? 0));
  }, 0);
  const spentAllTimeBefore = (claimRows ?? []).reduce((total, claim) => {
    return total + Math.max(0, Math.trunc(claim.points_spent ?? 0));
  }, 0);
  const spentTodayBefore = (claimRows ?? []).reduce((total, claim) => {
    if (claim.claim_date !== dateKey) {
      return total;
    }
    return total + Math.max(0, Math.trunc(claim.points_spent ?? 0));
  }, 0);

  const pointsRequired = Math.max(0, Math.trunc(rewardTier.points_required));
  const remainingBefore = Math.max(0, dailyPointsTotal - spentAllTimeBefore);
  if (pointsRequired > remainingBefore) {
    return { success: false, error: "Pas assez d'etoiles pour cette recompense." };
  }

  const { data: insertedClaim, error: insertClaimError } = await supabase
    .from("reward_claims")
    .insert({
      family_id: context.familyId,
      child_profile_id: context.profile.id,
      reward_tier_id: rewardTier.id,
      points_spent: pointsRequired,
      claim_date: dateKey,
    })
    .select("claimed_at")
    .single();

  if (insertClaimError || !insertedClaim) {
    return { success: false, error: "Impossible d'enregistrer cet echange." };
  }

  const { count: usageCount } = await supabase
    .from("reward_claims")
    .select("*", { count: "exact", head: true })
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.profile.id)
    .eq("reward_tier_id", rewardTier.id);

  const spentToday = spentTodayBefore + pointsRequired;
  const remainingStars = Math.max(0, remainingBefore - pointsRequired);

  revalidateRewardPaths();
  return {
    success: true,
    data: {
      rewardTierId: rewardTier.id,
      rewardLabel: rewardTier.label,
      pointsSpent: pointsRequired,
      claimedAt: insertedClaim.claimed_at,
      usageCount: Math.max(1, usageCount ?? 1),
      spentToday,
      dailyPointsTotal,
      remainingStars,
    },
  };
}
