"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { evaluateAchievementsForChild } from "@/lib/api/achievements";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { computePointsForTransition } from "@/lib/domain/points";
import { canTransitionTaskStatus } from "@/lib/domain/task-status";
import { getTodayDateKey } from "@/lib/day-templates/date";
import type { ActionResult, TaskInstanceStatus } from "@/lib/day-templates/types";
import { incrementDemoDailyPoints, updateDemoTaskInstance } from "@/lib/demo/gamification-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateTaskStatusSchema = z.object({
  instanceId: z.string().uuid("Instance invalide."),
  newStatus: z.enum(["a_faire", "en_cours", "termine", "en_retard", "ignore"]),
});

export interface UpdateTaskStatusResult {
  instanceId: string;
  status: TaskInstanceStatus;
  pointsEarnedTask: number;
  pointsDelta: number;
  dailyPointsTotal: number;
  unlockedAchievementLabels: string[];
}

function revalidateTaskPaths(): void {
  revalidatePath("/child");
  revalidatePath("/child/my-day");
  revalidatePath("/parent/dashboard");
}

export async function updateTaskStatusAction(
  payload: unknown,
): Promise<ActionResult<UpdateTaskStatusResult>> {
  const parsed = updateTaskStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role !== "child" && context.role !== "parent") {
    return { success: false, error: "Action non autorisee." };
  }

  const dateKey = getTodayDateKey();
  const { instanceId, newStatus } = parsed.data;

  if (!isSupabaseEnabled()) {
    if (context.role !== "child") {
      return { success: false, error: "Action reservee a l'enfant." };
    }

    const instance = updateDemoTaskInstance(context.familyId, instanceId, {});
    if (!instance || instance.childProfileId !== context.profile.id) {
      return { success: false, error: "Tache introuvable." };
    }

    if (instance.assignedProfileId && instance.assignedProfileId !== context.profile.id) {
      return { success: false, error: "Cette tache est geree par un parent." };
    }

    if (!canTransitionTaskStatus(instance.status, newStatus)) {
      return { success: false, error: "Transition de statut non autorisee." };
    }

    const pointsDelta = computePointsForTransition({
      currentStatus: instance.status,
      nextStatus: newStatus,
      pointsBase: instance.pointsBase,
    });

    const pointsEarnedTask =
      newStatus === "termine" && instance.pointsEarned === 0 ? pointsDelta : instance.pointsEarned;

    const updated = updateDemoTaskInstance(context.familyId, instanceId, {
      status: newStatus,
      pointsEarned: pointsEarnedTask,
    });

    if (!updated) {
      return { success: false, error: "Impossible de mettre a jour la tache." };
    }

    const dailyPoints =
      pointsDelta > 0
        ? incrementDemoDailyPoints(context.familyId, context.profile.id, dateKey, pointsDelta)
        : incrementDemoDailyPoints(context.familyId, context.profile.id, dateKey, 0);

    const unlockedAchievements = await evaluateAchievementsForChild(context.profile.id);

    revalidateTaskPaths();
    return {
      success: true,
      data: {
        instanceId: updated.id,
        status: updated.status,
        pointsEarnedTask: updated.pointsEarned,
        pointsDelta,
        dailyPointsTotal: dailyPoints.pointsTotal,
        unlockedAchievementLabels: unlockedAchievements.map((achievement) => achievement.label),
      },
    };
  }

  const useAdmin =
    context.source === "child-pin" && context.role === "child" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = useAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  const { data: instance, error: instanceError } = await supabase
    .from("task_instances")
    .select("*")
    .eq("id", instanceId)
    .maybeSingle();

  if (instanceError || !instance) {
    return { success: false, error: "Tache introuvable." };
  }

  if (instance.family_id !== context.familyId) {
    return { success: false, error: "Action non autorisee." };
  }

  if (context.role === "child" && instance.child_profile_id !== context.profile.id) {
    return { success: false, error: "Action non autorisee." };
  }

  if (context.role === "child" && instance.assigned_profile_id && instance.assigned_profile_id !== context.profile.id) {
    return { success: false, error: "Cette tache est geree par un parent." };
  }

  if (!canTransitionTaskStatus(instance.status, newStatus)) {
    return { success: false, error: "Transition de statut non autorisee." };
  }

  const pointsDelta = computePointsForTransition({
    currentStatus: instance.status,
    nextStatus: newStatus,
    pointsBase: instance.points_base,
  });

  const pointsEarnedTask =
    newStatus === "termine" && instance.points_earned === 0 ? pointsDelta : instance.points_earned;

  const { data: updatedInstance, error: updateError } = await supabase
    .from("task_instances")
    .update({
      status: newStatus,
      points_earned: pointsEarnedTask,
    })
    .eq("id", instance.id)
    .select("*")
    .single();

  if (updateError || !updatedInstance) {
    return { success: false, error: "Impossible de mettre a jour la tache." };
  }

  let dailyPointsTotal = 0;

  await supabase.from("daily_points").upsert(
    {
      family_id: instance.family_id,
      child_profile_id: instance.child_profile_id,
      date: dateKey,
      points_total: 0,
    },
    { onConflict: "child_profile_id,date", ignoreDuplicates: true },
  );

  const { data: currentDaily } = await supabase
    .from("daily_points")
    .select("points_total")
    .eq("family_id", instance.family_id)
    .eq("child_profile_id", instance.child_profile_id)
    .eq("date", dateKey)
    .maybeSingle();

  const currentPointsTotal = currentDaily?.points_total ?? 0;

  if (pointsDelta > 0) {
    const { data: updatedDaily } = await supabase
      .from("daily_points")
      .update({
        points_total: Math.max(0, currentPointsTotal + pointsDelta),
      })
      .eq("family_id", instance.family_id)
      .eq("child_profile_id", instance.child_profile_id)
      .eq("date", dateKey)
      .select("*")
      .single();

    dailyPointsTotal = updatedDaily?.points_total ?? currentPointsTotal + pointsDelta;
  } else {
    dailyPointsTotal = currentPointsTotal;
  }

  const unlockedAchievements = await evaluateAchievementsForChild(instance.child_profile_id);

  revalidateTaskPaths();
  return {
    success: true,
    data: {
      instanceId: updatedInstance.id,
      status: updatedInstance.status,
      pointsEarnedTask: updatedInstance.points_earned,
      pointsDelta,
      dailyPointsTotal,
      unlockedAchievementLabels: unlockedAchievements.map((achievement) => achievement.label),
    },
  };
}
