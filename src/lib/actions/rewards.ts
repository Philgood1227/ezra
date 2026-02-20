"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { deleteDemoRewardTier, upsertDemoRewardTier } from "@/lib/demo/gamification-store";
import type { ActionResult, RewardTierInput } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const rewardTierSchema = z.object({
  label: z.string().trim().min(2, "Le nom de la récompense est obligatoire."),
  description: z.string().trim().max(200).nullable(),
  pointsRequired: z.number().int().min(0).max(9999),
  sortOrder: z.number().int().min(0).max(999),
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
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/my-day");
}

export async function createRewardTierAction(
  input: RewardTierInput,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action réservée au parent." };
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
    return { success: false, error: "Impossible de créer la récompense pour le moment." };
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
    return { success: false, error: "Action réservée au parent." };
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
    return { success: false, error: "Impossible de modifier cette récompense." };
  }

  revalidateRewardsPaths();
  return { success: true };
}

export async function deleteRewardTierAction(rewardTierId: string): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action réservée au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoRewardTier(familyId, rewardTierId);
    if (!deleted) {
      return { success: false, error: "Récompense introuvable." };
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
    return { success: false, error: "Impossible de supprimer cette récompense." };
  }

  revalidateRewardsPaths();
  return { success: true };
}

