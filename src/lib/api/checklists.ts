import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import { getDateKeyFromDate } from "@/lib/day-templates/date";
import {
  listDemoChecklistInstancesByDates,
  listDemoChecklistTemplates,
} from "@/lib/demo/school-diary-store";
import type {
  ChecklistByDay,
  ChecklistInstanceSummary,
  ChecklistTemplateSummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ChecklistTemplateRow = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistItemRow = Database["public"]["Tables"]["checklist_items"]["Row"];
type ChecklistInstanceRow = Database["public"]["Tables"]["checklist_instances"]["Row"];
type ChecklistInstanceItemRow = Database["public"]["Tables"]["checklist_instance_items"]["Row"];

function mapChecklistTemplate(
  row: ChecklistTemplateRow,
  items: ChecklistItemRow[],
): ChecklistTemplateSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    type: row.type,
    label: row.label,
    description: row.description,
    isDefault: row.is_default,
    items: items
      .map((item) => ({
        id: item.id,
        templateId: item.template_id,
        label: item.label,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

function mapChecklistInstance(
  row: ChecklistInstanceRow,
  items: ChecklistInstanceItemRow[],
): ChecklistInstanceSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    diaryEntryId: row.diary_entry_id,
    type: row.type,
    label: row.label,
    date: row.date,
    createdAt: row.created_at,
    items: items
      .map((item) => ({
        id: item.id,
        checklistInstanceId: item.checklist_instance_id,
        label: item.label,
        isChecked: item.is_checked,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

export interface ChecklistPageData {
  child: ChildProfileRef | null;
  byDay: ChecklistByDay;
}

export async function getChecklistTemplatesForCurrentFamily(): Promise<ChecklistTemplateSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoChecklistTemplates(context.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data: templatesData, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("family_id", context.familyId)
    .order("type", { ascending: true })
    .order("label", { ascending: true });

  if (templatesError || !templatesData || templatesData.length === 0) {
    return [];
  }

  const templateIds = templatesData.map((template) => template.id);

  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("*")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  const itemsByTemplateId = new Map<string, ChecklistItemRow[]>();
  (itemsData ?? []).forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    current.push(item as ChecklistItemRow);
    itemsByTemplateId.set(item.template_id, current);
  });

  return (templatesData as ChecklistTemplateRow[]).map((template) =>
    mapChecklistTemplate(template, itemsByTemplateId.get(template.id) ?? []),
  );
}

export async function getChecklistsForCurrentChildByDay(): Promise<ChecklistByDay> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { today: [], tomorrow: [] };
  }

  const now = new Date();
  const todayKey = getDateKeyFromDate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = getDateKeyFromDate(tomorrow);

  const entries = await getChecklistInstancesForChildAndDates(child.id, [todayKey, tomorrowKey]);

  return {
    today: entries.filter((instance) => instance.date === todayKey),
    tomorrow: entries.filter((instance) => instance.date === tomorrowKey),
  };
}

export async function getChecklistPageDataForCurrentChild(): Promise<ChecklistPageData> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { child: null, byDay: { today: [], tomorrow: [] } };
  }

  const byDay = await getChecklistsForCurrentChildByDay();
  return {
    child,
    byDay,
  };
}

export async function getChecklistInstancesForChildAndDates(
  childProfileId: string,
  dateKeys: string[],
): Promise<ChecklistInstanceSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId || dateKeys.length === 0) {
    return [];
  }

  const normalizedDates = [...new Set(dateKeys)].sort();

  if (!isSupabaseEnabled()) {
    return listDemoChecklistInstancesByDates(context.familyId, childProfileId, normalizedDates);
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: instancesData, error: instancesError } = await supabase
    .from("checklist_instances")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .in("date", normalizedDates)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (instancesError || !instancesData || instancesData.length === 0) {
    return [];
  }

  const instanceIds = instancesData.map((instance) => instance.id);

  const { data: itemsData } = await supabase
    .from("checklist_instance_items")
    .select("*")
    .in("checklist_instance_id", instanceIds)
    .order("sort_order", { ascending: true });

  const itemsByInstanceId = new Map<string, ChecklistInstanceItemRow[]>();
  (itemsData ?? []).forEach((item) => {
    const current = itemsByInstanceId.get(item.checklist_instance_id) ?? [];
    current.push(item as ChecklistInstanceItemRow);
    itemsByInstanceId.set(item.checklist_instance_id, current);
  });

  return (instancesData as ChecklistInstanceRow[]).map((instance) =>
    mapChecklistInstance(instance, itemsByInstanceId.get(instance.id) ?? []),
  );
}

export async function getChecklistSummaryForCurrentChild(): Promise<{
  todayCount: number;
  tomorrowCount: number;
}> {
  const byDay = await getChecklistsForCurrentChildByDay();
  return {
    todayCount: byDay.today.length,
    tomorrowCount: byDay.tomorrow.length,
  };
}

export async function getUncheckedChecklistCountForCurrentChild(): Promise<number> {
  const byDay = await getChecklistsForCurrentChildByDay();
  const allItems = [...byDay.today, ...byDay.tomorrow].flatMap((entry) => entry.items);
  return allItems.filter((item) => !item.isChecked).length;
}
