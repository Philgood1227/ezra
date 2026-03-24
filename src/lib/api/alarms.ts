import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import {
  getDemoAlarmRuleById,
  listDemoAlarmEvents,
  listDemoAlarmRules,
} from "@/lib/demo/alarms-store";
import type { AlarmEventWithRule, AlarmRuleSummary } from "@/lib/day-templates/types";
import { decodeAlarmRuleLabel, parseAlarmRuleKindFromLabel } from "@/lib/domain/alarms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AlarmRuleRow = Database["public"]["Tables"]["alarm_rules"]["Row"];
type AlarmEventRow = Database["public"]["Tables"]["alarm_events"]["Row"];

function shouldUseAdminClientForChildPin(
  context: Awaited<ReturnType<typeof getCurrentProfile>>,
): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function mapAlarmRule(row: AlarmRuleRow): AlarmRuleSummary {
  const ruleKind = parseAlarmRuleKindFromLabel(row.label);
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    ruleKind,
    label: decodeAlarmRuleLabel(row.label),
    mode: row.mode,
    oneShotAt: row.one_shot_at,
    timeOfDay: row.time_of_day,
    daysMask: row.days_mask,
    soundKey: row.sound_key,
    message: row.message,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlarmEventWithRule(
  row: AlarmEventRow,
  ruleById: Map<string, Pick<AlarmRuleSummary, "label" | "message" | "soundKey">>,
): AlarmEventWithRule {
  const fallbackRule = ruleById.get(row.alarm_rule_id);

  return {
    id: row.id,
    alarmRuleId: row.alarm_rule_id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    dueAt: row.due_at,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at,
    status: row.status,
    createdAt: row.created_at,
    ruleLabel: fallbackRule?.label ?? "Alarme",
    ruleMessage: fallbackRule?.message ?? "C'est l'heure.",
    ruleSoundKey: fallbackRule?.soundKey ?? "cloche_douce",
  };
}

async function listSupabaseRulesForChild(input: {
  familyId: string;
  childProfileId: string;
  useAdminClient: boolean;
}): Promise<AlarmRuleSummary[]> {
  const supabase = input.useAdminClient
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("alarm_rules")
    .select("*")
    .eq("family_id", input.familyId)
    .eq("child_profile_id", input.childProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapAlarmRule(row as AlarmRuleRow));
}

async function listSupabaseEventsForChild(input: {
  familyId: string;
  childProfileId: string;
  includeAcknowledged: boolean;
  limit: number;
  useAdminClient: boolean;
}): Promise<AlarmEventWithRule[]> {
  const supabase = input.useAdminClient
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  let query = supabase
    .from("alarm_events")
    .select("*")
    .eq("family_id", input.familyId)
    .eq("child_profile_id", input.childProfileId)
    .order("triggered_at", { ascending: false })
    .limit(input.limit);

  if (!input.includeAcknowledged) {
    query = query.eq("status", "declenchee");
  }

  const { data: eventRows, error: eventError } = await query;
  if (eventError || !eventRows || eventRows.length === 0) {
    return [];
  }

  const ruleIds = [...new Set(eventRows.map((row) => row.alarm_rule_id))];
  const { data: ruleRows } = await supabase.from("alarm_rules").select("*").in("id", ruleIds);

  const ruleById = new Map<string, Pick<AlarmRuleSummary, "label" | "message" | "soundKey">>();
  (ruleRows ?? []).forEach((row) => {
    const mapped = mapAlarmRule(row as AlarmRuleRow);
    ruleById.set(mapped.id, {
      label: mapped.label,
      message: mapped.message,
      soundKey: mapped.soundKey,
    });
  });

  return eventRows.map((row) => mapAlarmEventWithRule(row as AlarmEventRow, ruleById));
}

function listDemoEventsWithRules(input: {
  familyId: string;
  childProfileId: string;
  includeAcknowledged: boolean;
  limit: number;
}): AlarmEventWithRule[] {
  const events = listDemoAlarmEvents(input.familyId, input.childProfileId, {
    includeAcknowledged: input.includeAcknowledged,
    limit: input.limit,
  });

  return events.map((event) => {
    const rule = getDemoAlarmRuleById(input.familyId, input.childProfileId, event.alarmRuleId);
    return {
      ...event,
      ruleLabel: rule?.label ?? "Alarme",
      ruleMessage: rule?.message ?? "C'est l'heure.",
      ruleSoundKey: rule?.soundKey ?? "cloche_douce",
    };
  });
}

export async function getParentAlarmPageData(): Promise<{
  child: ChildProfileRef | null;
  rules: AlarmRuleSummary[];
  events: AlarmEventWithRule[];
}> {
  return getParentAlarmPageDataByKind("alarm");
}

export async function getParentAlarmPageDataByKind(
  ruleKind: "alarm" | "time_timer",
): Promise<{
  child: ChildProfileRef | null;
  rules: AlarmRuleSummary[];
  events: AlarmEventWithRule[];
}> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return { child: null, rules: [], events: [] };
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { child: null, rules: [], events: [] };
  }

  if (!isSupabaseEnabled()) {
    const allRules = listDemoAlarmRules(context.familyId, child.id);
    const filteredRules = allRules.filter((rule) => (rule.ruleKind ?? "alarm") === ruleKind);
    return {
      child,
      rules: filteredRules,
      events: listDemoEventsWithRules({
        familyId: context.familyId,
        childProfileId: child.id,
        includeAcknowledged: true,
        limit: 20,
      }).filter((eventItem) =>
        filteredRules.some((rule) => rule.id === eventItem.alarmRuleId),
      ),
    };
  }

  const allRules = await listSupabaseRulesForChild({
    familyId: context.familyId,
    childProfileId: child.id,
    useAdminClient: false,
  });
  const rules = allRules.filter((rule) => (rule.ruleKind ?? "alarm") === ruleKind);
  const supabaseEvents = await listSupabaseEventsForChild({
    familyId: context.familyId,
    childProfileId: child.id,
    includeAcknowledged: true,
    limit: 20,
    useAdminClient: false,
  });
  const events = supabaseEvents.filter((eventItem) => rules.some((rule) => rule.id === eventItem.alarmRuleId));

  return {
    child,
    rules,
    events,
  };
}

export async function getAlarmRulesForCurrentChild(): Promise<AlarmRuleSummary[]> {
  return getAlarmRulesForCurrentChildByKind("alarm");
}

export async function getAlarmRulesForCurrentChildByKind(
  ruleKind: "alarm" | "time_timer",
): Promise<AlarmRuleSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "child" || !context.profile?.id) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoAlarmRules(context.familyId, context.profile.id).filter(
      (rule) => (rule.ruleKind ?? "alarm") === ruleKind,
    );
  }

  return (await listSupabaseRulesForChild({
    familyId: context.familyId,
    childProfileId: context.profile.id,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  })).filter((rule) => (rule.ruleKind ?? "alarm") === ruleKind);
}

export async function getPendingAlarmEventsForCurrentChild(
  limit = 5,
): Promise<AlarmEventWithRule[]> {
  return getPendingAlarmEventsForCurrentChildByKind("alarm", limit);
}

export async function getPendingAlarmEventsForCurrentChildByKind(
  ruleKind: "alarm" | "time_timer",
  limit = 5,
): Promise<AlarmEventWithRule[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "child" || !context.profile?.id) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const rules = listDemoAlarmRules(context.familyId, context.profile.id).filter(
      (rule) => (rule.ruleKind ?? "alarm") === ruleKind,
    );
    return listDemoEventsWithRules({
      familyId: context.familyId,
      childProfileId: context.profile.id,
      includeAcknowledged: false,
      limit,
    }).filter((eventItem) => rules.some((rule) => rule.id === eventItem.alarmRuleId));
  }

  const rules = (await listSupabaseRulesForChild({
    familyId: context.familyId,
    childProfileId: context.profile.id,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  })).filter((rule) => rule.ruleKind === ruleKind);

  return (await listSupabaseEventsForChild({
    familyId: context.familyId,
    childProfileId: context.profile.id,
    includeAcknowledged: false,
    limit,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  })).filter((eventItem) => rules.some((rule) => rule.id === eventItem.alarmRuleId));
}
