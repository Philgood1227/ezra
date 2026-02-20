import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import {
  getDemoAlarmRuleById,
  listDemoAlarmEvents,
  listDemoAlarmRules,
} from "@/lib/demo/alarms-store";
import type { AlarmEventWithRule, AlarmRuleSummary } from "@/lib/day-templates/types";
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
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    label: row.label,
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
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return { child: null, rules: [], events: [] };
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { child: null, rules: [], events: [] };
  }

  if (!isSupabaseEnabled()) {
    return {
      child,
      rules: listDemoAlarmRules(context.familyId, child.id),
      events: listDemoEventsWithRules({
        familyId: context.familyId,
        childProfileId: child.id,
        includeAcknowledged: true,
        limit: 20,
      }),
    };
  }

  const rules = await listSupabaseRulesForChild({
    familyId: context.familyId,
    childProfileId: child.id,
    useAdminClient: false,
  });
  const events = await listSupabaseEventsForChild({
    familyId: context.familyId,
    childProfileId: child.id,
    includeAcknowledged: true,
    limit: 20,
    useAdminClient: false,
  });

  return {
    child,
    rules,
    events,
  };
}

export async function getAlarmRulesForCurrentChild(): Promise<AlarmRuleSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "child" || !context.profile?.id) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoAlarmRules(context.familyId, context.profile.id);
  }

  return listSupabaseRulesForChild({
    familyId: context.familyId,
    childProfileId: context.profile.id,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  });
}

export async function getPendingAlarmEventsForCurrentChild(
  limit = 5,
): Promise<AlarmEventWithRule[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "child" || !context.profile?.id) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoEventsWithRules({
      familyId: context.familyId,
      childProfileId: context.profile.id,
      includeAcknowledged: false,
      limit,
    });
  }

  return listSupabaseEventsForChild({
    familyId: context.familyId,
    childProfileId: context.profile.id,
    includeAcknowledged: false,
    limit,
    useAdminClient: shouldUseAdminClientForChildPin(context),
  });
}
