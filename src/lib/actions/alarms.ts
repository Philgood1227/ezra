"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAlarmRulesForCurrentChildByKind,
  getPendingAlarmEventsForCurrentChildByKind,
} from "@/lib/api/alarms";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  acknowledgeDemoAlarmEvent,
  createDemoAlarmEventIfMissing,
  deleteDemoAlarmRule,
  setDemoAlarmRuleEnabled,
  upsertDemoAlarmRule,
} from "@/lib/demo/alarms-store";
import type { ActionResult, AlarmRuleInput, AlarmRuleKind } from "@/lib/day-templates/types";
import {
  encodeAlarmRuleLabelByKind,
  getDueAtIsoForRuleNow,
  getModeDaysMask,
  getNextDueAtIsoForRule,
  sanitizeDaysMask,
} from "@/lib/domain/alarms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const timeOfDayRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const alarmRuleSchema = z
  .object({
    label: z.string().trim().min(2, "Le nom de l'alarme est requis.").max(120),
    mode: z.enum(["ponctuelle", "semaine_travail", "semaine_complete", "personnalise"]),
    oneShotAt: z.string().trim().nullable(),
    timeOfDay: z.string().trim().nullable(),
    daysMask: z.number().int().min(0).max(127),
    soundKey: z.string().trim().min(2, "Le son est requis.").max(50),
    message: z.string().trim().min(2, "Le message est requis.").max(500),
    enabled: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "ponctuelle") {
      if (!value.oneShotAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["oneShotAt"],
          message: "La date et l'heure sont requises.",
        });
      } else if (Number.isNaN(new Date(value.oneShotAt).getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["oneShotAt"],
          message: "Date ponctuelle invalide.",
        });
      }

      if (value.timeOfDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeOfDay"],
          message: "Ne renseigne pas d'heure recurrente pour une alarme ponctuelle.",
        });
      }

      return;
    }

    if (!value.timeOfDay || !timeOfDayRegex.test(value.timeOfDay)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeOfDay"],
        message: "Heure recurrente invalide.",
      });
    }

    if (value.oneShotAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["oneShotAt"],
        message: "La date ponctuelle est reservee au mode ponctuel.",
      });
    }

    if (value.mode === "personnalise" && sanitizeDaysMask(value.daysMask) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daysMask"],
        message: "Choisis au moins un jour pour la recurrence personnalisee.",
      });
    }
  });

const toggleSchema = z.object({
  ruleId: z.string().uuid("Alarme invalide."),
  enabled: z.boolean(),
});

const deleteSchema = z.object({
  ruleId: z.string().uuid("Alarme invalide."),
});

const pollSchema = z.object({
  nowIso: z.string().datetime("Horodatage invalide."),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  toleranceMinutes: z.number().int().min(1).max(15).optional(),
});

const acknowledgeSchema = z.object({
  eventId: z.string().uuid("Evenement invalide."),
});

interface ParentAlarmContext {
  familyId: string;
  childProfileId: string;
}

const ruleKindSchema = z.enum(["alarm", "time_timer"]).default("alarm");

function shouldUseAdminClientForChildPin(
  context: Awaited<ReturnType<typeof getCurrentProfile>>,
): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function normalizeAlarmInput(input: z.infer<typeof alarmRuleSchema>, ruleKind: AlarmRuleKind): AlarmRuleInput {
  return {
    ruleKind,
    label: encodeAlarmRuleLabelByKind(input.label.trim(), ruleKind),
    mode: input.mode,
    oneShotAt: input.mode === "ponctuelle" ? input.oneShotAt : null,
    timeOfDay:
      input.mode === "ponctuelle"
        ? null
        : (input.timeOfDay?.slice(0, 5) ?? null),
    daysMask: getModeDaysMask(input.mode, input.daysMask),
    soundKey: input.soundKey.trim(),
    message: input.message.trim(),
    enabled: input.enabled,
  };
}

function revalidateAlarmPaths(): void {
  revalidatePath("/parent/alarms");
  revalidatePath("/parent-v2/alarms");
  revalidatePath("/parent-v2/time-timer");
  revalidatePath("/child");
  revalidatePath("/child/my-day");
}

async function requireParentAlarmContext(): Promise<ParentAlarmContext | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return null;
  }

  return {
    familyId: context.familyId,
    childProfileId: child.id,
  };
}

export async function createAlarmRuleAction(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentAlarmContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = alarmRuleSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const ruleKind = ruleKindSchema.parse((payload as { ruleKind?: string } | null)?.ruleKind ?? "alarm");
  const normalized = normalizeAlarmInput(parsed.data, ruleKind);

  if (!isSupabaseEnabled()) {
    const created = upsertDemoAlarmRule(context.familyId, context.childProfileId, normalized);
    if (!created) {
      return { success: false, error: "Impossible de creer l'alarme." };
    }
    revalidateAlarmPaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("alarm_rules")
    .insert({
      family_id: context.familyId,
      child_profile_id: context.childProfileId,
      label: normalized.label,
      mode: normalized.mode,
      one_shot_at: normalized.oneShotAt,
      time_of_day: normalized.timeOfDay,
      days_mask: normalized.daysMask,
      sound_key: normalized.soundKey,
      message: normalized.message,
      enabled: normalized.enabled,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer l'alarme." };
  }

  revalidateAlarmPaths();
  return { success: true, data: { id: data.id } };
}

export async function updateAlarmRuleAction(
  ruleId: string,
  payload: unknown,
): Promise<ActionResult> {
  const context = await requireParentAlarmContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = alarmRuleSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const ruleKind = ruleKindSchema.parse((payload as { ruleKind?: string } | null)?.ruleKind ?? "alarm");
  const normalized = normalizeAlarmInput(parsed.data, ruleKind);

  if (!isSupabaseEnabled()) {
    const updated = upsertDemoAlarmRule(
      context.familyId,
      context.childProfileId,
      normalized,
      ruleId,
    );
    if (!updated) {
      return { success: false, error: "Alarme introuvable." };
    }

    revalidateAlarmPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("alarm_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Alarme introuvable." };
  }

  const { error } = await supabase
    .from("alarm_rules")
    .update({
      label: normalized.label,
      mode: normalized.mode,
      one_shot_at: normalized.oneShotAt,
      time_of_day: normalized.timeOfDay,
      days_mask: normalized.daysMask,
      sound_key: normalized.soundKey,
      message: normalized.message,
      enabled: normalized.enabled,
    })
    .eq("id", ruleId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId);

  if (error) {
    return { success: false, error: "Impossible de modifier cette alarme." };
  }

  revalidateAlarmPaths();
  return { success: true };
}

export async function toggleAlarmRuleEnabledAction(payload: unknown): Promise<ActionResult> {
  const context = await requireParentAlarmContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = toggleSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = setDemoAlarmRuleEnabled(
      context.familyId,
      context.childProfileId,
      parsed.data.ruleId,
      parsed.data.enabled,
    );
    if (!updated) {
      return { success: false, error: "Alarme introuvable." };
    }

    revalidateAlarmPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("alarm_rules")
    .update({ enabled: parsed.data.enabled })
    .eq("id", parsed.data.ruleId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId);

  if (error) {
    return { success: false, error: "Impossible de modifier cette alarme." };
  }

  revalidateAlarmPaths();
  return { success: true };
}

export async function deleteAlarmRuleAction(payload: unknown): Promise<ActionResult> {
  const context = await requireParentAlarmContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoAlarmRule(context.familyId, context.childProfileId, parsed.data.ruleId);
    if (!deleted) {
      return { success: false, error: "Alarme introuvable." };
    }

    revalidateAlarmPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("alarm_rules")
    .delete()
    .eq("id", parsed.data.ruleId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette alarme." };
  }

  revalidateAlarmPaths();
  return { success: true };
}

async function getChildAlarmContext(): Promise<{
  familyId: string;
  childProfileId: string;
  useAdminClient: boolean;
} | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "child" || !context.profile?.id) {
    return null;
  }

  return {
    familyId: context.familyId,
    childProfileId: context.profile.id,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  };
}

async function insertSupabaseAlarmEventIfMissing(input: {
  familyId: string;
  childProfileId: string;
  alarmRuleId: string;
  dueAt: string;
  useAdminClient: boolean;
}): Promise<void> {
  const supabase = input.useAdminClient
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { error } = await supabase.from("alarm_events").insert({
    alarm_rule_id: input.alarmRuleId,
    family_id: input.familyId,
    child_profile_id: input.childProfileId,
    due_at: input.dueAt,
    status: "declenchee",
  });

  if (error && error.code !== "23505") {
    throw new Error("Impossible d'enregistrer un evenement d'alarme.");
  }
}

export async function pollDueAlarmEventsAction(
  payload: unknown,
): Promise<ActionResult<{ events: Awaited<ReturnType<typeof getPendingAlarmEventsForCurrentChildByKind>> }>> {
  const parsed = pollSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const ruleKind = ruleKindSchema.parse((payload as { ruleKind?: string } | null)?.ruleKind ?? "alarm");
  const context = await getChildAlarmContext();
  if (!context) {
    return { success: false, error: "Action reservee au profil enfant." };
  }

  const rules = await getAlarmRulesForCurrentChildByKind(ruleKind);
  const dueCandidates = rules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      ruleId: rule.id,
      dueAt: getDueAtIsoForRuleNow({
        rule,
        nowIso: parsed.data.nowIso,
        timezoneOffsetMinutes: parsed.data.timezoneOffsetMinutes,
        toleranceMinutes: parsed.data.toleranceMinutes ?? 2,
      }),
    }))
    .filter((entry): entry is { ruleId: string; dueAt: string } => Boolean(entry.dueAt));

  if (dueCandidates.length > 0) {
    if (!isSupabaseEnabled()) {
      dueCandidates.forEach((candidate) => {
        createDemoAlarmEventIfMissing(context.familyId, context.childProfileId, {
          alarmRuleId: candidate.ruleId,
          dueAt: candidate.dueAt,
        });
      });
    } else {
      for (const candidate of dueCandidates) {
        await insertSupabaseAlarmEventIfMissing({
          familyId: context.familyId,
          childProfileId: context.childProfileId,
          alarmRuleId: candidate.ruleId,
          dueAt: candidate.dueAt,
          useAdminClient: context.useAdminClient,
        });
      }
    }
  }

  const events = await getPendingAlarmEventsForCurrentChildByKind(ruleKind, 5);
  return { success: true, data: { events } };
}

export async function getNextTimeTimerStateAction(
  payload: unknown,
): Promise<
  ActionResult<{
    dueAtIso: string | null;
    message: string | null;
    soundKey: string | null;
    label: string | null;
  }>
> {
  const parsed = pollSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const rules = await getAlarmRulesForCurrentChildByKind("time_timer");
  const enabledRules = rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) {
    return { success: true, data: { dueAtIso: null, message: null, soundKey: null, label: null } };
  }

  const candidates = enabledRules
    .map((rule) => ({
      rule,
      dueAtIso: getNextDueAtIsoForRule({
        rule,
        nowIso: parsed.data.nowIso,
        timezoneOffsetMinutes: parsed.data.timezoneOffsetMinutes,
      }),
    }))
    .filter((entry): entry is { rule: (typeof enabledRules)[number]; dueAtIso: string } => Boolean(entry.dueAtIso))
    .sort((left, right) => left.dueAtIso.localeCompare(right.dueAtIso));

  const next = candidates[0];
  if (!next) {
    return { success: true, data: { dueAtIso: null, message: null, soundKey: null, label: null } };
  }

  return {
    success: true,
    data: {
      dueAtIso: next.dueAtIso,
      message: next.rule.message,
      soundKey: next.rule.soundKey,
      label: next.rule.label,
    },
  };
}

export async function acknowledgeAlarmEventAction(payload: unknown): Promise<ActionResult> {
  const parsed = acknowledgeSchema.safeParse(payload);
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

  const childProfileId =
    context.role === "child"
      ? context.profile.id
      : (await getPrimaryChildProfileForCurrentFamily())?.id;

  if (!childProfileId) {
    return { success: false, error: "Profil enfant introuvable." };
  }

  if (!isSupabaseEnabled()) {
    const event = acknowledgeDemoAlarmEvent(context.familyId, childProfileId, parsed.data.eventId);
    if (!event) {
      return { success: false, error: "Evenement introuvable." };
    }

    revalidatePath("/child");
    return { success: true };
  }

  const useAdminClient = shouldUseAdminClientForChildPin(context);
  const supabase = useAdminClient ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data: eventRow } = await supabase
    .from("alarm_events")
    .select("id, family_id, child_profile_id, status")
    .eq("id", parsed.data.eventId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!eventRow) {
    return { success: false, error: "Evenement introuvable." };
  }

  if (context.role === "child" && eventRow.child_profile_id !== context.profile.id) {
    return { success: false, error: "Action non autorisee." };
  }

  if (eventRow.status === "acknowledged") {
    return { success: true };
  }

  const { error } = await supabase
    .from("alarm_events")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.eventId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible d'acquitter cette alarme." };
  }

  revalidatePath("/child");
  return { success: true };
}
