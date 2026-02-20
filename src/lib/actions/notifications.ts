"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDateKeyFromDate } from "@/lib/day-templates/date";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  createDemoInAppNotification,
  listDemoChecklistInstancesByDates,
  listDemoNotificationRules,
  listDemoSchoolDiaryEntries,
  markDemoNotificationRead,
  updateDemoNotificationRule,
  upsertDemoPushSubscription,
} from "@/lib/demo/school-diary-store";
import type {
  ActionResult,
  NotificationRuleInput,
  NotificationRuleSummary,
  PushSubscriptionInput,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const notificationRuleSchema = z.object({
  type: z.enum(["rappel_devoir", "rappel_checklist", "rappel_journee"]),
  channel: z.enum(["in_app", "push", "both"]),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide."),
  enabled: z.boolean(),
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Endpoint invalide."),
  p256dh: z.string().min(1, "Clé p256dh manquante."),
  auth: z.string().min(1, "Clé auth manquante."),
  userAgent: z.string().nullable(),
});

const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid("Notification invalide."),
});

interface ParentContext {
  familyId: string;
  parentProfileId: string;
  childProfileId: string;
}

async function requireParentContext(): Promise<ParentContext | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId || !context.profile?.id) {
    return null;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return null;
  }

  return {
    familyId: context.familyId,
    parentProfileId: context.profile.id,
    childProfileId: child.id,
  };
}

function revalidateNotificationPages(): void {
  revalidatePath("/parent/notifications");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/checklists");
  revalidatePath("/child/my-day");
}

export async function updateNotificationRuleAction(
  ruleId: string,
  input: NotificationRuleInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = notificationRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = updateDemoNotificationRule(context.familyId, ruleId, parsed.data);
    if (!updated) {
      return { success: false, error: "Regle introuvable." };
    }
    revalidateNotificationPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notification_rules")
    .update({
      channel: parsed.data.channel,
      time_of_day: parsed.data.timeOfDay,
      enabled: parsed.data.enabled,
    })
    .eq("id", ruleId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId)
    .eq("type", parsed.data.type);

  if (error) {
    return { success: false, error: "Impossible de modifier cette regle." };
  }

  revalidateNotificationPages();
  return { success: true };
}

export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Abonnement invalide." };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoPushSubscription(context.familyId, {
      childProfileId: context.childProfileId,
      profileId: context.parentProfileId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent,
    });

    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      family_id: context.familyId,
      child_profile_id: context.childProfileId,
      profile_id: context.parentProfileId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.userAgent,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return { success: false, error: "Impossible d'activer les rappels push." };
  }

  return { success: true };
}

async function insertInAppNotification(
  familyId: string,
  childProfileId: string,
  payload: {
    type: "rappel_devoir" | "rappel_checklist" | "rappel_journee";
    title: string;
    message: string;
    linkUrl: string | null;
  },
): Promise<void> {
  if (!isSupabaseEnabled()) {
    createDemoInAppNotification(familyId, {
      childProfileId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("in_app_notifications").insert({
    family_id: familyId,
    child_profile_id: childProfileId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link_url: payload.linkUrl,
  });
}

export async function sendTestRemindersNowAction(): Promise<
  ActionResult<{ created: number; pushEligible: number }>
> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = getDateKeyFromDate(tomorrow);
  const todayKey = getDateKeyFromDate(now);

  let rules: NotificationRuleSummary[] = [];
  let diaryEntriesCount = 0;
  let checklistTomorrowCount = 0;

  if (!isSupabaseEnabled()) {
    rules = listDemoNotificationRules(context.familyId, context.childProfileId).filter((rule) => rule.enabled);
    diaryEntriesCount = listDemoSchoolDiaryEntries(context.familyId, context.childProfileId).filter(
      (entry) =>
        entry.date === tomorrowKey && (entry.type === "devoir" || entry.type === "evaluation"),
    ).length;
    checklistTomorrowCount = listDemoChecklistInstancesByDates(
      context.familyId,
      context.childProfileId,
      [tomorrowKey],
    ).length;
  } else {
    const supabase = await createSupabaseServerClient();
    const [{ data: rulesRows }, { data: diaryRows }, { data: checklistRows }] = await Promise.all([
      supabase
        .from("notification_rules")
        .select("*")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", context.childProfileId)
        .eq("enabled", true),
      supabase
        .from("school_diary_entries")
        .select("id")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", context.childProfileId)
        .eq("date", tomorrowKey)
        .in("type", ["devoir", "evaluation"]),
      supabase
        .from("checklist_instances")
        .select("id")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", context.childProfileId)
        .eq("date", tomorrowKey),
    ]);

    rules = (rulesRows ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      childProfileId: row.child_profile_id,
      type: row.type,
      channel: row.channel,
      timeOfDay: row.time_of_day,
      enabled: row.enabled,
    }));
    diaryEntriesCount = (diaryRows ?? []).length;
    checklistTomorrowCount = (checklistRows ?? []).length;
  }

  let createdCount = 0;
  let pushEligible = 0;

  for (const rule of rules) {
    if (rule.type === "rappel_devoir" && diaryEntriesCount > 0) {
      if (rule.channel === "in_app" || rule.channel === "both") {
        await insertInAppNotification(context.familyId, context.childProfileId, {
          type: "rappel_devoir",
          title: "Rappel devoirs",
          message: `Tu as ${diaryEntriesCount} devoir(s) ou evaluation(s) pour demain.`,
          linkUrl: "/child/checklists",
        });
        createdCount += 1;
      }

      if (rule.channel === "push" || rule.channel === "both") {
        pushEligible += 1;
      }
    }

    if (rule.type === "rappel_checklist" && checklistTomorrowCount > 0) {
      if (rule.channel === "in_app" || rule.channel === "both") {
        await insertInAppNotification(context.familyId, context.childProfileId, {
          type: "rappel_checklist",
          title: "Checklist pour demain",
          message: `Pense a preparer ${checklistTomorrowCount} checklist(s) pour demain.`,
          linkUrl: "/child/checklists",
        });
        createdCount += 1;
      }

      if (rule.channel === "push" || rule.channel === "both") {
        pushEligible += 1;
      }
    }

    if (rule.type === "rappel_journee") {
      if (rule.channel === "in_app" || rule.channel === "both") {
        await insertInAppNotification(context.familyId, context.childProfileId, {
          type: "rappel_journee",
          title: "Repere de la journee",
          message: `Ta journee du ${todayKey} est disponible dans Ma journee.`,
          linkUrl: "/child/my-day",
        });
        createdCount += 1;
      }

      if (rule.channel === "push" || rule.channel === "both") {
        pushEligible += 1;
      }
    }
  }

  revalidateNotificationPages();
  return {
    success: true,
    data: {
      created: createdCount,
      pushEligible,
    },
  };
}

export async function markInAppNotificationReadAction(payload: unknown): Promise<ActionResult> {
  const parsed = markNotificationReadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = markDemoNotificationRead(
      context.familyId,
      parsed.data.notificationId,
      context.role === "child" ? context.profile.id : "dev-child-id",
    );
    if (!updated) {
      return { success: false, error: "Notification introuvable." };
    }

    revalidateNotificationPages();
    return { success: true };
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("in_app_notifications")
    .select("id, family_id, child_profile_id")
    .eq("id", parsed.data.notificationId)
    .maybeSingle();

  if (!row || row.family_id !== context.familyId) {
    return { success: false, error: "Notification introuvable." };
  }

  if (context.role === "child" && row.child_profile_id !== context.profile.id) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase
    .from("in_app_notifications")
    .update({ is_read: true })
    .eq("id", parsed.data.notificationId);

  if (error) {
    return { success: false, error: "Impossible de marquer la notification." };
  }

  revalidateNotificationPages();
  return { success: true };
}

