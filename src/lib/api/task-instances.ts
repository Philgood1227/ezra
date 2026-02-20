import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getDemoTaskInstanceById } from "@/lib/demo/gamification-store";
import { listDemoCategories } from "@/lib/demo/day-templates-store";
import { normalizeTimeLabel } from "@/lib/day-templates/time";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TaskInstanceRow = Database["public"]["Tables"]["task_instances"]["Row"];
type TemplateTaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];
type CategoryRow = Database["public"]["Tables"]["task_categories"]["Row"];

export async function getTaskInstanceByIdForCurrentProfile(
  instanceId: string,
): Promise<TaskInstanceSummary | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return null;
  }

  if (!isSupabaseEnabled()) {
    const categories = listDemoCategories(context.familyId);
    const instance = getDemoTaskInstanceById(context.familyId, instanceId, categories);
    if (!instance) {
      return null;
    }

    if (context.role === "child" && instance.childProfileId !== context.profile.id) {
      return null;
    }

    return instance;
  }

  const useAdmin =
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = useAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  const { data: instance, error: instanceError } = await supabase
    .from("task_instances")
    .select("*")
    .eq("id", instanceId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (instanceError || !instance) {
    return null;
  }

  if (context.role === "child" && instance.child_profile_id !== context.profile.id) {
    return null;
  }

  const [{ data: task }, { data: category }] = await Promise.all([
    supabase
      .from("template_tasks")
      .select("*")
      .eq("id", instance.template_task_id)
      .maybeSingle(),
    supabase.from("task_categories").select("*").eq("family_id", context.familyId),
  ]);

  const taskRow = task as TemplateTaskRow | null;
  if (!taskRow || !category) {
    return null;
  }

  const categoryRow = (category as CategoryRow[]).find((entry) => entry.id === taskRow.category_id);
  if (!categoryRow) {
    return null;
  }

  const row = instance as TaskInstanceRow;
  const assignedProfileId = row.assigned_profile_id ?? taskRow.assigned_profile_id;
  const { data: assignedProfile } = assignedProfileId
    ? await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", assignedProfileId)
        .maybeSingle()
    : { data: null };

  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    templateTaskId: row.template_task_id,
    itemKind: row.item_kind ?? taskRow.item_kind ?? categoryRow.default_item_kind ?? "mission",
    itemSubkind: row.item_subkind ?? taskRow.item_subkind ?? null,
    assignedProfileId,
    assignedProfileDisplayName: assignedProfile?.display_name ?? null,
    assignedProfileRole: assignedProfile?.role ?? null,
    date: row.date,
    status: row.status,
    startTime: normalizeTimeLabel(row.start_time),
    endTime: normalizeTimeLabel(row.end_time),
    pointsBase: row.points_base,
    pointsEarned: row.points_earned,
    title: taskRow.title,
    description: taskRow.description,
    sortOrder: taskRow.sort_order,
    category: {
      id: categoryRow.id,
      familyId: categoryRow.family_id,
      name: categoryRow.name,
      icon: categoryRow.icon,
      colorKey: categoryRow.color_key,
      defaultItemKind: categoryRow.default_item_kind,
    },
  };
}
