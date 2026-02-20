"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TemplateRow = Database["public"]["Tables"]["day_templates"]["Row"];
type TemplateTaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];

export interface EnsureTodayInstancesInput {
  supabase: SupabaseClient<Database>;
  familyId: string;
  childProfileId: string;
  weekday: number;
  dateKey: string;
}

export interface EnsureTodayInstancesResult {
  template: TemplateRow | null;
}

export async function ensureTodayTaskInstances({
  supabase,
  familyId,
  childProfileId,
  weekday,
  dateKey,
}: EnsureTodayInstancesInput): Promise<EnsureTodayInstancesResult> {
  const { data: templates, error: templateError } = await supabase
    .from("day_templates")
    .select("*")
    .eq("family_id", familyId)
    .eq("weekday", weekday)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (templateError || !templates || templates.length === 0) {
    return { template: null };
  }

  const template = templates[0] as TemplateRow;

  const { data: templateTasks, error: templateTasksError } = await supabase
    .from("template_tasks")
    .select("*")
    .eq("template_id", template.id)
    .order("start_time", { ascending: true })
    .order("sort_order", { ascending: true });

  if (templateTasksError || !templateTasks || templateTasks.length === 0) {
    return { template };
  }

  const taskRows = templateTasks as TemplateTaskRow[];
  const templateTaskIds = taskRows.map((task) => task.id);

  const { data: existingInstances, error: existingError } = await supabase
    .from("task_instances")
    .select("template_task_id")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfileId)
    .eq("date", dateKey)
    .in("template_task_id", templateTaskIds);

  if (existingError) {
    return { template };
  }

  const existingIds = new Set((existingInstances ?? []).map((entry) => entry.template_task_id));

  const missing = taskRows.filter((task) => !existingIds.has(task.id));
  if (missing.length === 0) {
    return { template };
  }

  const insertPayload = missing.map((task) => ({
    family_id: familyId,
    child_profile_id: childProfileId,
    template_task_id: task.id,
    item_kind: task.item_kind,
    item_subkind: task.item_subkind,
    date: dateKey,
    status: "a_faire" as const,
    start_time: task.start_time,
    end_time: task.end_time,
    points_base: task.points_base,
    points_earned: 0,
    assigned_profile_id: task.assigned_profile_id,
  }));

  await supabase.from("task_instances").insert(insertPayload);

  return { template };
}
