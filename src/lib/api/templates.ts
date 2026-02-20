import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getWeekdayLabel, getWeekdaySortKey, WEEKDAY_OPTIONS } from "@/lib/day-templates/constants";
import {
  listDemoCategories,
  listDemoSchoolPeriods,
  listDemoTemplateBlocks,
  listDemoTemplateTasks,
  listDemoTemplates,
} from "@/lib/demo/day-templates-store";
import { sortTemplateTasks } from "@/lib/day-templates/timeline";
import { normalizeTimeLabel } from "@/lib/day-templates/time";
import type {
  DayTemplateBlockSummary,
  SchoolPeriodSummary,
  TaskCategorySummary,
  TemplateSummary,
  TemplateTaskSummary,
  TemplateWeekdayOverview,
  TemplateWithTasks,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface FamilyContext {
  familyId: string;
}

async function getFamilyContext(): Promise<FamilyContext | null> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  return { familyId: context.familyId };
}

type CategoryRow = Database["public"]["Tables"]["task_categories"]["Row"];
type TemplateRow = Database["public"]["Tables"]["day_templates"]["Row"];
type TaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];
type DayTemplateBlockRow = Database["public"]["Tables"]["day_template_blocks"]["Row"];
type SchoolPeriodRow = Database["public"]["Tables"]["school_periods"]["Row"];
type KnowledgeCardRow = Database["public"]["Tables"]["knowledge_cards"]["Row"];

function mapCategoryRow(row: CategoryRow): TaskCategorySummary {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    icon: row.icon,
    colorKey: row.color_key,
    defaultItemKind: row.default_item_kind,
  };
}

function mapTemplateRow(row: TemplateRow): TemplateSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    weekday: row.weekday,
    isDefault: row.is_default,
  };
}

function mapBlockRow(row: DayTemplateBlockRow): DayTemplateBlockSummary {
  return {
    id: row.id,
    dayTemplateId: row.day_template_id,
    blockType: row.block_type,
    label: row.label,
    startTime: normalizeTimeLabel(row.start_time),
    endTime: normalizeTimeLabel(row.end_time),
    sortOrder: row.sort_order,
  };
}

function mapSchoolPeriodRow(row: SchoolPeriodRow): SchoolPeriodSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    periodType: row.period_type,
    startDate: row.start_date,
    endDate: row.end_date,
    label: row.label,
  };
}

function sortBlocks(blocks: DayTemplateBlockSummary[]): DayTemplateBlockSummary[] {
  return [...blocks].sort((left, right) => {
    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    return left.sortOrder - right.sortOrder;
  });
}

function mapTaskRow(
  row: TaskRow,
  category: TaskCategorySummary | undefined,
  assignedProfile: { id: string; displayName: string; role: "parent" | "child" | "viewer" } | null,
  knowledgeCardTitle: string | null = null,
): TemplateTaskSummary | null {
  if (!category) {
    return null;
  }

  return {
    id: row.id,
    templateId: row.template_id,
    categoryId: row.category_id,
    itemKind: row.item_kind,
    itemSubkind: row.item_subkind,
    assignedProfileId: row.assigned_profile_id,
    assignedProfileDisplayName: assignedProfile?.displayName ?? null,
    assignedProfileRole: assignedProfile?.role ?? null,
    title: row.title,
    description: row.description,
    startTime: normalizeTimeLabel(row.start_time),
    endTime: normalizeTimeLabel(row.end_time),
    sortOrder: row.sort_order,
    pointsBase: row.points_base,
    knowledgeCardId: row.knowledge_card_id,
    knowledgeCardTitle,
    category,
  };
}

export async function getTaskCategoriesForCurrentFamily(): Promise<TaskCategorySummary[]> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoCategories(family.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("task_categories")
    .select("*")
    .eq("family_id", family.familyId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapCategoryRow);
}

export async function getSchoolPeriodsForCurrentFamily(): Promise<SchoolPeriodSummary[]> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoSchoolPeriods(family.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school_periods")
    .select("*")
    .eq("family_id", family.familyId)
    .order("start_date", { ascending: true })
    .order("end_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapSchoolPeriodRow(row as SchoolPeriodRow));
}

export async function getAllTemplatesForCurrentFamily(): Promise<TemplateSummary[]> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoTemplates(family.familyId).sort(
      (left, right) => getWeekdaySortKey(left.weekday) - getWeekdaySortKey(right.weekday),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("day_templates")
    .select("*")
    .eq("family_id", family.familyId)
    .order("weekday", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .map(mapTemplateRow)
    .sort((left, right) => getWeekdaySortKey(left.weekday) - getWeekdaySortKey(right.weekday));
}

export async function getTemplatesWithTasksForWeekday(weekday: number): Promise<TemplateWithTasks[]> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const templates = listDemoTemplates(family.familyId).filter((template) => template.weekday === weekday);
    return templates.map((template) => ({
      ...template,
      tasks: listDemoTemplateTasks(family.familyId, template.id),
      blocks: listDemoTemplateBlocks(family.familyId, template.id),
    }));
  }

  const supabase = await createSupabaseServerClient();
  const { data: templatesData, error: templatesError } = await supabase
    .from("day_templates")
    .select("*")
    .eq("family_id", family.familyId)
    .eq("weekday", weekday)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (templatesError || !templatesData || templatesData.length === 0) {
    return [];
  }

  const templateIds = templatesData.map((template) => template.id);

  const [
    { data: tasksData, error: tasksError },
    { data: categoriesData, error: categoriesError },
    { data: blocksData },
  ] = await Promise.all([
    supabase
      .from("template_tasks")
      .select("*")
      .in("template_id", templateIds)
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("task_categories").select("*").eq("family_id", family.familyId),
    supabase
      .from("day_template_blocks")
      .select("*")
      .in("day_template_id", templateIds)
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  if (tasksError || categoriesError || !tasksData || !categoriesData) {
    return templatesData.map((template) => ({
      ...mapTemplateRow(template),
      tasks: [],
      blocks: sortBlocks(
        (blocksData ?? [])
          .filter((row) => row.day_template_id === template.id)
          .map((row) => mapBlockRow(row as DayTemplateBlockRow)),
      ),
    }));
  }

  const categoryById = new Map(categoriesData.map((category) => [category.id, mapCategoryRow(category)]));
  const assignedProfileIds = [
    ...new Set(tasksData.map((task) => task.assigned_profile_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: assignedProfiles } = assignedProfileIds.length
    ? await supabase.from("profiles").select("id, display_name, role").in("id", assignedProfileIds)
    : { data: [] as Array<{ id: string; display_name: string; role: "parent" | "child" | "viewer" }> };
  const assignedProfileById = new Map(
    (assignedProfiles ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role,
      },
    ]),
  );
  const knowledgeCardIds = [
    ...new Set((tasksData ?? []).map((task) => task.knowledge_card_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: knowledgeRows } = knowledgeCardIds.length
    ? await supabase.from("knowledge_cards").select("id, title").in("id", knowledgeCardIds)
    : { data: [] as Pick<KnowledgeCardRow, "id" | "title">[] };
  const knowledgeTitleById = new Map((knowledgeRows ?? []).map((row) => [row.id, row.title]));

  return templatesData.map((template) => {
    const mappedTasks = tasksData
      .filter((task) => task.template_id === template.id)
      .map((task) =>
        mapTaskRow(
          task,
          categoryById.get(task.category_id),
          assignedProfileById.get(task.assigned_profile_id ?? "") ?? null,
          knowledgeTitleById.get(task.knowledge_card_id ?? "") ?? null,
        ),
      )
      .filter((task): task is TemplateTaskSummary => task !== null);

    const mappedBlocks = sortBlocks(
      (blocksData ?? [])
        .filter((row) => row.day_template_id === template.id)
        .map((row) => mapBlockRow(row as DayTemplateBlockRow)),
    );

    return {
      ...mapTemplateRow(template),
      tasks: sortTemplateTasks(mappedTasks),
      blocks: mappedBlocks,
    };
  });
}

export async function getTemplateByIdForCurrentFamily(templateId: string): Promise<TemplateWithTasks | null> {
  const family = await getFamilyContext();
  if (!family) {
    return null;
  }

  if (!isSupabaseEnabled()) {
    const template = listDemoTemplates(family.familyId).find((entry) => entry.id === templateId);
    if (!template) {
      return null;
    }

    return {
      ...template,
      tasks: listDemoTemplateTasks(family.familyId, templateId),
      blocks: listDemoTemplateBlocks(family.familyId, templateId),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: template, error: templateError } = await supabase
    .from("day_templates")
    .select("*")
    .eq("id", templateId)
    .eq("family_id", family.familyId)
    .maybeSingle();

  if (templateError || !template) {
    return null;
  }

  const [{ data: tasksData }, { data: categoriesData }, { data: blocksData }] = await Promise.all([
    supabase
      .from("template_tasks")
      .select("*")
      .eq("template_id", template.id)
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("task_categories").select("*").eq("family_id", family.familyId),
    supabase
      .from("day_template_blocks")
      .select("*")
      .eq("day_template_id", template.id)
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  const categories = categoriesData ?? [];
  const tasks = tasksData ?? [];
  const categoryById = new Map(categories.map((category) => [category.id, mapCategoryRow(category)]));
  const assignedProfileIds = [
    ...new Set(tasks.map((task) => task.assigned_profile_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: assignedProfiles } = assignedProfileIds.length
    ? await supabase.from("profiles").select("id, display_name, role").in("id", assignedProfileIds)
    : { data: [] as Array<{ id: string; display_name: string; role: "parent" | "child" | "viewer" }> };
  const assignedProfileById = new Map(
    (assignedProfiles ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role,
      },
    ]),
  );
  const knowledgeCardIds = [...new Set(tasks.map((task) => task.knowledge_card_id).filter((id): id is string => Boolean(id)))];
  const { data: knowledgeRows } = knowledgeCardIds.length
    ? await supabase.from("knowledge_cards").select("id, title").in("id", knowledgeCardIds)
    : { data: [] as Pick<KnowledgeCardRow, "id" | "title">[] };
  const knowledgeTitleById = new Map((knowledgeRows ?? []).map((row) => [row.id, row.title]));

  return {
    ...mapTemplateRow(template),
    tasks: sortTemplateTasks(
      tasks
        .map((task) =>
          mapTaskRow(
            task,
            categoryById.get(task.category_id),
            assignedProfileById.get(task.assigned_profile_id ?? "") ?? null,
            knowledgeTitleById.get(task.knowledge_card_id ?? "") ?? null,
          ),
        )
        .filter((task): task is TemplateTaskSummary => task !== null),
    ),
    blocks: sortBlocks((blocksData ?? []).map((row) => mapBlockRow(row as DayTemplateBlockRow))),
  };
}

export async function getTemplateWeekOverviewForCurrentFamily(): Promise<TemplateWeekdayOverview[]> {
  const family = await getFamilyContext();
  if (!family) {
    return WEEKDAY_OPTIONS.map((weekdayOption) => ({
      weekday: weekdayOption.value,
      weekdayLabel: getWeekdayLabel(weekdayOption.value),
      defaultTemplate: null,
      defaultTemplateBlocks: [],
      templates: [],
    })).sort((left, right) => getWeekdaySortKey(left.weekday) - getWeekdaySortKey(right.weekday));
  }

  const templates = await getAllTemplatesForCurrentFamily();
  const defaultTemplateIds = templates.filter((template) => template.isDefault).map((template) => template.id);

  let blockMap = new Map<string, DayTemplateBlockSummary[]>();

  if (!isSupabaseEnabled()) {
    blockMap = new Map(
      defaultTemplateIds.map((templateId) => [templateId, listDemoTemplateBlocks(family.familyId, templateId)]),
    );
  } else if (defaultTemplateIds.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("day_template_blocks")
      .select("*")
      .in("day_template_id", defaultTemplateIds)
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true });

    blockMap = new Map<string, DayTemplateBlockSummary[]>();

    for (const row of data ?? []) {
      const mapped = mapBlockRow(row as DayTemplateBlockRow);
      const existing = blockMap.get(mapped.dayTemplateId) ?? [];
      existing.push(mapped);
      blockMap.set(mapped.dayTemplateId, existing);
    }

    blockMap.forEach((blocks, templateId) => {
      blockMap.set(templateId, sortBlocks(blocks));
    });
  }

  return WEEKDAY_OPTIONS.map((weekdayOption) => {
    const weekdayTemplates = templates.filter((template) => template.weekday === weekdayOption.value);
    const defaultTemplate = weekdayTemplates.find((template) => template.isDefault) ?? null;

    return {
      weekday: weekdayOption.value,
      weekdayLabel: getWeekdayLabel(weekdayOption.value),
      defaultTemplate,
      defaultTemplateBlocks: defaultTemplate ? blockMap.get(defaultTemplate.id) ?? [] : [],
      templates: weekdayTemplates,
    };
  }).sort((left, right) => getWeekdaySortKey(left.weekday) - getWeekdaySortKey(right.weekday));
}
