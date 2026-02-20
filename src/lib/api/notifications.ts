import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import {
  ensureDemoNotificationRules,
  getDemoUnreadNotificationsCount,
  listDemoInAppNotifications,
  listDemoNotificationRules,
} from "@/lib/demo/school-diary-store";
import type {
  InAppNotificationSummary,
  NotificationRuleSummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NotificationRuleRow = Database["public"]["Tables"]["notification_rules"]["Row"];
type InAppNotificationRow = Database["public"]["Tables"]["in_app_notifications"]["Row"];

function mapNotificationRule(row: NotificationRuleRow): NotificationRuleSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    type: row.type,
    channel: row.channel,
    timeOfDay: row.time_of_day,
    enabled: row.enabled,
  };
}

function mapInAppNotification(row: InAppNotificationRow): InAppNotificationSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    type: row.type,
    title: row.title,
    message: row.message,
    linkUrl: row.link_url,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

const DEFAULT_RULES: Array<{
  type: NotificationRuleSummary["type"];
  channel: NotificationRuleSummary["channel"];
  timeOfDay: string;
}> = [
  { type: "rappel_devoir", channel: "both", timeOfDay: "18:00" },
  { type: "rappel_checklist", channel: "both", timeOfDay: "18:30" },
  { type: "rappel_journee", channel: "in_app", timeOfDay: "07:00" },
];

async function ensureSupabaseNotificationRules(
  familyId: string,
  childProfileId: string,
): Promise<NotificationRuleSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("notification_rules")
    .select("*")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfileId)
    .order("created_at", { ascending: false })
    .order("type", { ascending: true });

  const latestByType = new Map<NotificationRuleSummary["type"], NotificationRuleRow>();
  (existing ?? []).forEach((row) => {
    const typedRow = row as NotificationRuleRow;
    if (!latestByType.has(typedRow.type)) {
      latestByType.set(typedRow.type, typedRow);
    }
  });

  const missingDefaults = DEFAULT_RULES.filter((rule) => !latestByType.has(rule.type));
  if (missingDefaults.length > 0) {
    const payload = missingDefaults.map((rule) => ({
      family_id: familyId,
      child_profile_id: childProfileId,
      type: rule.type,
      channel: rule.channel,
      time_of_day: rule.timeOfDay,
      enabled: true,
    }));

    const { data: inserted } = await supabase.from("notification_rules").insert(payload).select("*");
    (inserted ?? []).forEach((row) => {
      const typedRow = row as NotificationRuleRow;
      latestByType.set(typedRow.type, typedRow);
    });
  }

  return [...latestByType.values()]
    .map((row) => mapNotificationRule(row))
    .sort((left, right) => left.type.localeCompare(right.type));
}

export async function getNotificationRulesForCurrentFamily(): Promise<{
  child: ChildProfileRef | null;
  rules: NotificationRuleSummary[];
}> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return { child: null, rules: [] };
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { child: null, rules: [] };
  }

  if (!isSupabaseEnabled()) {
    ensureDemoNotificationRules(context.familyId, child.id);
    return {
      child,
      rules: listDemoNotificationRules(context.familyId, child.id),
    };
  }

  const rules = await ensureSupabaseNotificationRules(context.familyId, child.id);
  return { child, rules };
}

export async function getInAppNotificationsForCurrentChild(
  options?: { limit?: number; includeRead?: boolean },
): Promise<InAppNotificationSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const all = listDemoInAppNotifications(context.familyId, child.id);
    const filtered = options?.includeRead ? all : all.filter((entry) => !entry.isRead);
    return options?.limit ? filtered.slice(0, options.limit) : filtered;
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === child.id &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  let query = supabase
    .from("in_app_notifications")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", child.id)
    .order("created_at", { ascending: false });

  if (!options?.includeRead) {
    query = query.eq("is_read", false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((row) => mapInAppNotification(row as InAppNotificationRow));
}

export async function getUnreadInAppNotificationsCountForCurrentChild(): Promise<number> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return 0;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return 0;
  }

  if (!isSupabaseEnabled()) {
    return getDemoUnreadNotificationsCount(context.familyId, child.id);
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === child.id &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("in_app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("family_id", context.familyId)
    .eq("child_profile_id", child.id)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
