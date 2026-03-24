import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import { getEmotionLogsForChild } from "@/lib/api/emotions";
import { getMealsForChild } from "@/lib/api/meals";
import { buildWeekDateKeys, computeDashboardWeekSummary, getWeekStartKey } from "@/lib/domain/dashboard";
import { getOrCreateDemoDailyPoints, listDemoTaskInstances } from "@/lib/demo/gamification-store";
import { listDemoCategories } from "@/lib/demo/day-templates-store";
import { listDemoSchoolDiaryEntries } from "@/lib/demo/school-diary-store";
import { getDateKeyFromDate } from "@/lib/day-templates/date";
import { parseCategoryColorKey, parseCategoryIconKey, resolveCategoryCode } from "@/lib/day-templates/constants";
import type { DailyPointsSummary, TaskInstanceSummary } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TaskInstanceRow = Database["public"]["Tables"]["task_instances"]["Row"];
type TemplateTaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];
type TaskCategoryRow = Database["public"]["Tables"]["task_categories"]["Row"];
type DailyPointsRow = Database["public"]["Tables"]["daily_points"]["Row"];

function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function mapDailyPointsRow(row: DailyPointsRow): DailyPointsSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    date: row.date,
    pointsTotal: row.points_total,
  };
}

function mapTaskRowsToSummaries(input: {
  taskRows: TaskInstanceRow[];
  templateTasks: TemplateTaskRow[];
  categories: TaskCategoryRow[];
  profileById: Map<string, { displayName: string; role: "parent" | "child" | "viewer" }>;
}): TaskInstanceSummary[] {
  const templateById = new Map(input.templateTasks.map((task) => [task.id, task]));
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const summaries: TaskInstanceSummary[] = [];

  for (const row of input.taskRows) {
    const template = templateById.get(row.template_task_id);
    if (!template) {
      continue;
    }

    const category = categoryById.get(template.category_id);
    if (!category) {
      continue;
    }

    const assignedProfileId = row.assigned_profile_id ?? template.assigned_profile_id;
    const assignedProfile = assignedProfileId ? input.profileById.get(assignedProfileId) : undefined;

    summaries.push({
      id: row.id,
      familyId: row.family_id,
      childProfileId: row.child_profile_id,
      templateTaskId: row.template_task_id,
      itemKind: row.item_kind ?? template.item_kind ?? category.default_item_kind ?? "mission",
      itemSubkind: row.item_subkind ?? template.item_subkind ?? null,
      assignedProfileId,
      assignedProfileDisplayName: assignedProfile?.displayName ?? null,
      assignedProfileRole: assignedProfile?.role ?? null,
      date: row.date,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      pointsBase: row.points_base,
      pointsEarned: row.points_earned,
      title: template.title,
      description: template.description,
      sortOrder: template.sort_order,
      knowledgeCardId: template.knowledge_card_id,
      knowledgeCardTitle: null,
      category: {
        id: category.id,
        familyId: category.family_id,
        code: resolveCategoryCode({
          code: category.code,
          name: category.name,
          iconKey: category.icon,
          colorKey: category.color_key,
          defaultItemKind: category.default_item_kind,
        }),
        name: category.name,
        icon: parseCategoryIconKey(category.icon),
        colorKey: parseCategoryColorKey(category.color_key),
        defaultItemKind: category.default_item_kind,
      },
    } satisfies TaskInstanceSummary);
  }

  return summaries;
}

export interface ParentDashboardPageData {
  child: ChildProfileRef | null;
  weekStart: string;
  weekDateKeys: string[];
  summary: ReturnType<typeof computeDashboardWeekSummary> | null;
  schoolDiaryCount: number;
  schoolDiaryUpcoming: Array<{
    id: string;
    type: string;
    date: string;
    title: string;
  }>;
}

export async function getParentDashboardPageData(weekStartInput?: string): Promise<ParentDashboardPageData> {
  const context = await getCurrentProfile();
  const child = await getPrimaryChildProfileForCurrentFamily();

  const weekStart = isDateKey(weekStartInput) ? weekStartInput : getWeekStartKey(new Date());
  const weekDateKeys = buildWeekDateKeys(weekStart);
  const weekEnd = weekDateKeys[weekDateKeys.length - 1] ?? weekStart;
  const todayKey = getDateKeyFromDate(new Date());

  if (!child || !context.familyId) {
    return {
      child: null,
      weekStart,
      weekDateKeys,
      summary: null,
      schoolDiaryCount: 0,
      schoolDiaryUpcoming: [],
    };
  }

  if (!isSupabaseEnabled()) {
    const familyId = context.familyId;
    const categories = listDemoCategories(familyId);
    const tasks = weekDateKeys.flatMap((date) => listDemoTaskInstances(familyId, child.id, date, categories));
    const dailyPoints = weekDateKeys.map((date) => getOrCreateDemoDailyPoints(familyId, child.id, date));
    const [emotions, meals] = await Promise.all([
      getEmotionLogsForChild(child.id, { fromDate: weekStart, toDate: weekEnd }),
      getMealsForChild(child.id, { fromDate: weekStart, toDate: weekEnd }),
    ]);
    const schoolDiaryCount = listDemoSchoolDiaryEntries(familyId, child.id).filter(
      (entry) => entry.date >= weekStart && entry.date <= weekEnd,
    ).length;
    const schoolDiaryUpcoming = listDemoSchoolDiaryEntries(familyId, child.id)
      .filter((entry) => entry.date >= todayKey)
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, 3)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        date: entry.date,
        title: entry.title,
      }));

    return {
      child,
      weekStart,
      weekDateKeys,
      summary: computeDashboardWeekSummary({
        weekStart,
        weekDateKeys,
        tasks,
        dailyPoints,
        emotions,
        meals,
        todayKey,
      }),
      schoolDiaryCount,
      schoolDiaryUpcoming,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: taskRows }, { data: dailyRows }, { data: diaryRows }, { data: upcomingDiaryRows }] = await Promise.all([
    supabase
      .from("task_instances")
      .select("*")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("daily_points")
      .select("*")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("school_diary_entries")
      .select("id")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("school_diary_entries")
      .select("id,type,date,title")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .gte("date", todayKey)
      .order("date", { ascending: true })
      .limit(3),
  ]);

  const templateTaskIds = [...new Set((taskRows ?? []).map((task) => task.template_task_id))];
  const { data: templateRows } = templateTaskIds.length
    ? await supabase.from("template_tasks").select("*").in("id", templateTaskIds)
    : { data: [] as TemplateTaskRow[] };

  const categoryIds = [
    ...new Set((templateRows ?? []).map((template) => template.category_id).filter((id): id is string => Boolean(id))),
  ];
  const assignedProfileIds = [
    ...new Set(
      [
        ...(taskRows ?? []).map((task) => task.assigned_profile_id),
        ...(templateRows ?? []).map((template) => template.assigned_profile_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: categoryRows }, { data: profileRows }, emotions, meals] = await Promise.all([
    categoryIds.length
      ? supabase.from("task_categories").select("*").in("id", categoryIds)
      : Promise.resolve({ data: [] as TaskCategoryRow[] }),
    assignedProfileIds.length
      ? supabase.from("profiles").select("id, display_name, role").in("id", assignedProfileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string; role: "parent" | "child" | "viewer" }> }),
    getEmotionLogsForChild(child.id, { fromDate: weekStart, toDate: weekEnd }),
    getMealsForChild(child.id, { fromDate: weekStart, toDate: weekEnd }),
  ]);

  const profileById = new Map(
    (profileRows ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        role: profile.role,
      },
    ]),
  );

  const tasks = mapTaskRowsToSummaries({
    taskRows: (taskRows ?? []) as TaskInstanceRow[],
    templateTasks: (templateRows ?? []) as TemplateTaskRow[],
    categories: (categoryRows ?? []) as TaskCategoryRow[],
    profileById,
  });

  const dailyPoints = (dailyRows ?? []).map((row) => mapDailyPointsRow(row as DailyPointsRow));

  return {
    child,
    weekStart,
    weekDateKeys,
    summary: computeDashboardWeekSummary({
      weekStart,
      weekDateKeys,
      tasks,
      dailyPoints,
      emotions,
      meals,
      todayKey,
    }),
    schoolDiaryCount: (diaryRows ?? []).length,
    schoolDiaryUpcoming: (upcomingDiaryRows ?? []).map((entry) => ({
      id: entry.id,
      type: entry.type,
      date: entry.date,
      title: entry.title,
    })),
  };
}
