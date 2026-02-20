"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  evaluateAchievementsForChild,
  getAchievementCatalogForCurrentFamily,
} from "@/lib/api/achievements";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createDemoAchievement, setDemoAchievementAutoTrigger } from "@/lib/demo/achievements-store";
import type { AchievementCondition } from "@/lib/day-templates/types";
import type { ActionResult } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const toggleSchema = z.object({
  achievementId: z.string().uuid("Succes invalide."),
  enabled: z.boolean(),
});

const evaluateSchema = z.object({
  childProfileId: z.string().uuid("Profil enfant invalide."),
});

const createCustomAchievementSchema = z.object({
  categoryId: z.string().uuid("Categorie invalide."),
  label: z.string().trim().min(2, "Le nom du succes est requis.").max(120),
  description: z.string().trim().max(280).nullable(),
  icon: z.string().trim().min(1, "Une icone est requise.").max(8),
  autoTrigger: z.boolean().default(true),
  conditionType: z.enum(["daily_points_at_least", "tasks_completed_in_row", "pomodoros_completed"]),
  conditionValue: z.number().int().min(1).max(999),
});

function normalizeAchievementCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCondition(input: {
  conditionType: "daily_points_at_least" | "tasks_completed_in_row" | "pomodoros_completed";
  conditionValue: number;
}): AchievementCondition {
  return {
    type: input.conditionType,
    value: input.conditionValue,
  };
}

function revalidateAchievementPaths(): void {
  revalidatePath("/parent/achievements");
  revalidatePath("/child/achievements");
  revalidatePath("/child/my-day");
}

async function requireParentFamilyId(): Promise<string | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  return context.familyId;
}

export async function toggleAchievementAutoTriggerAction(
  payload: unknown,
): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = toggleSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = setDemoAchievementAutoTrigger(
      familyId,
      parsed.data.achievementId,
      parsed.data.enabled,
    );

    if (!updated) {
      return { success: false, error: "Succes introuvable." };
    }

    revalidateAchievementPaths();
    return { success: true };
  }

  const catalog = await getAchievementCatalogForCurrentFamily();
  const achievement = catalog.achievements.find((entry) => entry.id === parsed.data.achievementId);
  if (!achievement) {
    return { success: false, error: "Succes introuvable." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("achievements")
    .update({ auto_trigger: parsed.data.enabled })
    .eq("id", parsed.data.achievementId);

  if (error) {
    return { success: false, error: "Impossible de modifier ce succes." };
  }

  revalidateAchievementPaths();
  return { success: true };
}

export async function evaluateAchievementsForTodayAction(
  payload: unknown,
): Promise<ActionResult<{ unlockedIds: string[]; unlockedLabels: string[] }>> {
  const parsed = evaluateSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role === "child" && context.profile?.id !== parsed.data.childProfileId) {
    return { success: false, error: "Action non autorisee." };
  }

  if (context.role !== "child" && context.role !== "parent") {
    return { success: false, error: "Action non autorisee." };
  }

  const unlocked = await evaluateAchievementsForChild(parsed.data.childProfileId);
  revalidateAchievementPaths();

  return {
    success: true,
    data: {
      unlockedIds: unlocked.map((achievement) => achievement.id),
      unlockedLabels: unlocked.map((achievement) => achievement.label),
    },
  };
}

export async function createCustomAchievementAction(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = createCustomAchievementSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const catalog = await getAchievementCatalogForCurrentFamily();
  const category = catalog.categories.find((entry) => entry.id === parsed.data.categoryId);
  if (!category) {
    return { success: false, error: "Categorie introuvable." };
  }

  const baseCode = normalizeAchievementCode(parsed.data.label) || "succes-personnalise";
  const existingCodes = new Set(
    catalog.achievements
      .filter((achievement) => achievement.categoryId === parsed.data.categoryId)
      .map((achievement) => achievement.code),
  );
  let code = baseCode;
  let cursor = 2;
  while (existingCodes.has(code)) {
    code = `${baseCode}-${cursor}`;
    cursor += 1;
  }

  const condition = buildCondition({
    conditionType: parsed.data.conditionType,
    conditionValue: parsed.data.conditionValue,
  });

  if (!isSupabaseEnabled()) {
    const created = createDemoAchievement(familyId, {
      categoryId: parsed.data.categoryId,
      code,
      label: parsed.data.label,
      description: parsed.data.description,
      icon: parsed.data.icon,
      autoTrigger: parsed.data.autoTrigger,
      condition,
    });

    if (!created) {
      return { success: false, error: "Impossible de creer ce succes." };
    }

    revalidateAchievementPaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("achievements")
    .insert({
      category_id: parsed.data.categoryId,
      code,
      label: parsed.data.label,
      description: parsed.data.description,
      icon: parsed.data.icon,
      auto_trigger: parsed.data.autoTrigger,
      condition: condition as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer ce succes." };
  }

  revalidateAchievementPaths();
  return { success: true, data: { id: data.id } };
}
