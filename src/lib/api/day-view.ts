import { ensureTodayTaskInstances } from "@/lib/actions/ensure-today-instances";
import { getChosenMovieForDate } from "@/lib/api/cinema";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { isDayPlanV2Enabled } from "@/config/feature-flags";
import {
  ensureDemoTaskInstancesForDate,
  getOrCreateDemoDailyPoints,
  listDemoRewardTiers,
  listDemoTaskInstances,
} from "@/lib/demo/gamification-store";
import {
  listDemoSchoolPeriods,
  listDemoTemplateBlocks,
  listDemoTemplateTasks,
  listDemoTemplates,
} from "@/lib/demo/day-templates-store";
import { computeDayBalanceFromTimelineItems } from "@/lib/day-templates/balance";
import { getTodayDateKey } from "@/lib/day-templates/date";
import {
  buildUnifiedTimelineItems,
  findCurrentActionItem,
  findCurrentContextItem,
  findNextTimelineItem,
} from "@/lib/day-templates/plan-items";
import { buildDayContext } from "@/lib/day-templates/school-calendar";
import { sortTemplateTasks } from "@/lib/day-templates/timeline";
import { getCurrentMinutes, normalizeTimeLabel } from "@/lib/day-templates/time";
import type {
  DayContextSummary,
  DayTemplateBlockSummary,
  DailyPointsSummary,
  RewardTierSummary,
  TaskInstanceSummary,
  TemplateSummary,
  TodayTimelineData,
  TodayTimelineV2Data,
} from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type TemplateRow = Database["public"]["Tables"]["day_templates"]["Row"];
type TemplateTaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];
type CategoryRow = Database["public"]["Tables"]["task_categories"]["Row"];
type TaskInstanceRow = Database["public"]["Tables"]["task_instances"]["Row"];
type RewardTierRow = Database["public"]["Tables"]["reward_tiers"]["Row"];
type DailyPointsRow = Database["public"]["Tables"]["daily_points"]["Row"];
type DayTemplateBlockRow = Database["public"]["Tables"]["day_template_blocks"]["Row"];
type SchoolPeriodRow = Database["public"]["Tables"]["school_periods"]["Row"];
type KnowledgeCardRow = Database["public"]["Tables"]["knowledge_cards"]["Row"];

function mapTemplate(row: TemplateRow): TemplateSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    weekday: row.weekday,
    isDefault: row.is_default,
  };
}

function mapTemplateBlock(row: DayTemplateBlockRow): DayTemplateBlockSummary {
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

function mapSchoolPeriodRow(row: SchoolPeriodRow): {
  id: string;
  familyId: string;
  periodType: "vacances" | "jour_special";
  startDate: string;
  endDate: string;
  label: string;
} {
  return {
    id: row.id,
    familyId: row.family_id,
    periodType: row.period_type,
    startDate: row.start_date,
    endDate: row.end_date,
    label: row.label,
  };
}

function getFallbackDayContext(date: Date): DayContextSummary {
  return buildDayContext({ date, periods: [], dayBlocks: [] });
}

function mapRewardTier(row: RewardTierRow): RewardTierSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    label: row.label,
    description: row.description,
    pointsRequired: row.points_required,
    sortOrder: row.sort_order,
  };
}

function mapDailyPoints(row: DailyPointsRow): DailyPointsSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    date: row.date,
    pointsTotal: row.points_total,
  };
}

function mapInstance(
  row: TaskInstanceRow,
  task: TemplateTaskRow | undefined,
  category: CategoryRow | undefined,
  assignedProfile: { id: string; displayName: string; role: "parent" | "child" | "viewer" } | null,
  knowledgeCardTitle: string | null = null,
): TaskInstanceSummary | null {
  if (!task || !category) {
    return null;
  }

  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    templateTaskId: row.template_task_id,
    itemKind: row.item_kind ?? task.item_kind ?? category.default_item_kind ?? "mission",
    itemSubkind: row.item_subkind ?? task.item_subkind ?? null,
    assignedProfileId: row.assigned_profile_id ?? task.assigned_profile_id,
    assignedProfileDisplayName: assignedProfile?.displayName ?? null,
    assignedProfileRole: assignedProfile?.role ?? null,
    date: row.date,
    status: row.status,
    startTime: normalizeTimeLabel(row.start_time),
    endTime: normalizeTimeLabel(row.end_time),
    pointsBase: row.points_base,
    pointsEarned: row.points_earned,
    title: task.title,
    description: task.description,
    sortOrder: task.sort_order,
    knowledgeCardId: task.knowledge_card_id,
    knowledgeCardTitle,
    source: "template_task",
    sourceRefId: task.id,
    category: {
      id: category.id,
      familyId: category.family_id,
      name: category.name,
      icon: category.icon,
      colorKey: category.color_key,
      defaultItemKind: category.default_item_kind,
    },
  };
}

function buildMovieTimelineInstance(input: {
  sessionId: string;
  familyId: string;
  childProfileId: string;
  dateKey: string;
  title: string;
  platform: string | null;
}): TaskInstanceSummary {
  return {
    id: `movie-${input.sessionId}`,
    familyId: input.familyId,
    childProfileId: input.childProfileId,
    templateTaskId: `movie-${input.sessionId}`,
    itemKind: "leisure",
    itemSubkind: "cinema",
    date: input.dateKey,
    status: "ignore",
    startTime: "20:00",
    endTime: "22:00",
    pointsBase: 0,
    pointsEarned: 0,
    title: `Film : ${input.title}`,
    description: input.platform ? `Soiree cinema sur ${input.platform}.` : "Soiree cinema en famille.",
    sortOrder: 999,
    isReadOnly: true,
    source: "movie_session",
    sourceRefId: input.sessionId,
    category: {
      id: "movie-category",
      familyId: input.familyId,
      name: "Cinema",
      icon: "🎬",
      colorKey: "category-loisir",
    },
  };
}

async function ensureSupabaseDailyPoints(
  familyId: string,
  childProfileId: string,
  dateKey: string,
): Promise<DailyPointsSummary | null> {
  const context = await getCurrentProfile();
  const useAdmin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = useAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();

  const { error: upsertError } = await supabase.from("daily_points").upsert(
    {
      family_id: familyId,
      child_profile_id: childProfileId,
      date: dateKey,
      points_total: 0,
    },
    { onConflict: "child_profile_id,date", ignoreDuplicates: true },
  );

  if (upsertError) {
    return null;
  }

  const { data } = await supabase
    .from("daily_points")
    .select("*")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfileId)
    .eq("date", dateKey)
    .maybeSingle();

  return data ? mapDailyPoints(data as DailyPointsRow) : null;
}

function toTimelineV2Data(
  baseData: TodayTimelineData,
  date: Date,
  options?: {
    enabled?: boolean;
  },
): TodayTimelineV2Data {
  const enabled = options?.enabled ?? isDayPlanV2Enabled();
  const timelineItems = enabled
    ? buildUnifiedTimelineItems({
        tasks: baseData.instances,
        blocks: baseData.blocks,
      })
    : [];
  const currentMinutes = getCurrentMinutes(date);

  return {
    ...baseData,
    v2Enabled: enabled,
    timelineItems,
    currentContextItem: enabled ? findCurrentContextItem(timelineItems, currentMinutes) : null,
    currentActionItem: enabled ? findCurrentActionItem(timelineItems, currentMinutes) : null,
    nextTimelineItem: enabled ? findNextTimelineItem(timelineItems, currentMinutes) : null,
    dayBalance: computeDayBalanceFromTimelineItems(timelineItems),
  };
}

export async function getTodayTemplateWithTasksForProfile(profileId: string): Promise<TodayTimelineData> {
  const now = new Date();
  const weekday = now.getDay();
  const dateKey = getTodayDateKey();
  const context = await getCurrentProfile();
  const fallbackDayContext = getFallbackDayContext(now);

  if (!profileId) {
    return {
      weekday,
      template: null,
      instances: [],
      blocks: [],
      dayContext: fallbackDayContext,
      dailyPoints: null,
      rewardTiers: [],
    };
  }

  if (!isSupabaseEnabled()) {
    const familyId = context.familyId;
    if (!familyId) {
      return {
        weekday,
        template: null,
        instances: [],
        blocks: [],
        dayContext: fallbackDayContext,
        dailyPoints: null,
        rewardTiers: [],
      };
    }

    const weekdayTemplates = listDemoTemplates(familyId).filter((template) => template.weekday === weekday);
    const template = weekdayTemplates.find((entry) => entry.isDefault) ?? weekdayTemplates[0] ?? null;
    const templateTasks = template ? listDemoTemplateTasks(familyId, template.id) : [];
    const templateBlocks = template ? listDemoTemplateBlocks(familyId, template.id) : [];
    const schoolPeriods = listDemoSchoolPeriods(familyId);

    const instances = template
      ? ensureDemoTaskInstancesForDate({
          familyId,
          childProfileId: profileId,
          date: dateKey,
          templateTasks,
        })
      : [];

    const categories = sortTemplateTasks(templateTasks).map((entry) => entry.category);
    const persistedInstances = listDemoTaskInstances(familyId, profileId, dateKey, categories);
    const dailyPoints = getOrCreateDemoDailyPoints(familyId, profileId, dateKey);
    const rewardTiers = listDemoRewardTiers(familyId);
    const chosenMovie = await getChosenMovieForDate(dateKey);
    const movieInstance = chosenMovie
      ? buildMovieTimelineInstance({
          sessionId: chosenMovie.sessionId,
          familyId,
          childProfileId: profileId,
          dateKey,
          title: chosenMovie.option.title,
          platform: chosenMovie.option.platform,
        })
      : null;

    const mergedInstances = movieInstance
      ? [...(persistedInstances.length > 0 ? persistedInstances : instances), movieInstance]
      : persistedInstances.length > 0
        ? persistedInstances
        : instances;

    const dayContext = buildDayContext({
      date: now,
      periods: schoolPeriods,
      dayBlocks: templateBlocks,
    });

    return {
      weekday,
      template,
      instances: mergedInstances,
      blocks: templateBlocks,
      dayContext,
      dailyPoints,
      rewardTiers,
    };
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === profileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  let profileRow: ProfileRow | null = null;

  if (shouldUseAdminClientForChildPin) {
    profileRow = context.profile as ProfileRow;
  } else {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (!profileError && profile) {
      profileRow = profile as ProfileRow;
    }
  }

  if (!profileRow) {
    return {
      weekday,
      template: null,
      instances: [],
      blocks: [],
      dayContext: fallbackDayContext,
      dailyPoints: null,
      rewardTiers: [],
    };
  }

  const ensured = await ensureTodayTaskInstances({
    supabase,
    familyId: profileRow.family_id,
    childProfileId: profileRow.id,
    weekday,
    dateKey,
  });

  const templateId = ensured.template?.id ?? null;
  const [
    { data: instanceRows, error: instancesError },
    { data: rewardRows },
    { data: blockRows },
    { data: schoolPeriodRows },
  ] = await Promise.all([
    supabase
      .from("task_instances")
      .select("*")
      .eq("family_id", profileRow.family_id)
      .eq("child_profile_id", profileRow.id)
      .eq("date", dateKey)
      .order("start_time", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("reward_tiers")
      .select("*")
      .eq("family_id", profileRow.family_id)
      .order("points_required", { ascending: true })
      .order("sort_order", { ascending: true }),
    templateId
      ? supabase
          .from("day_template_blocks")
          .select("*")
          .eq("day_template_id", templateId)
          .order("start_time", { ascending: true })
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as DayTemplateBlockRow[] }),
    supabase
      .from("school_periods")
      .select("*")
      .eq("family_id", profileRow.family_id)
      .order("start_date", { ascending: true })
      .order("end_date", { ascending: true }),
  ]);

  const templateBlocks = (blockRows ?? []).map((row) => mapTemplateBlock(row as DayTemplateBlockRow));
  const schoolPeriods = (schoolPeriodRows ?? []).map((row) => mapSchoolPeriodRow(row as SchoolPeriodRow));
  const dayContext = buildDayContext({
    date: now,
    periods: schoolPeriods,
    dayBlocks: templateBlocks,
  });

  const dailyPoints = await ensureSupabaseDailyPoints(profileRow.family_id, profileRow.id, dateKey);
  const chosenMovie = await getChosenMovieForDate(dateKey);
  const movieInstance = chosenMovie
    ? buildMovieTimelineInstance({
        sessionId: chosenMovie.sessionId,
        familyId: profileRow.family_id,
        childProfileId: profileRow.id,
        dateKey,
        title: chosenMovie.option.title,
        platform: chosenMovie.option.platform,
      })
    : null;

  if (instancesError || !instanceRows || instanceRows.length === 0) {
    return {
      weekday,
      template: ensured.template ? mapTemplate(ensured.template) : null,
      instances: movieInstance ? [movieInstance] : [],
      blocks: templateBlocks,
      dayContext,
      dailyPoints,
      rewardTiers: (rewardRows ?? []).map((row) => mapRewardTier(row as RewardTierRow)),
    };
  }

  const instanceTaskIds = [...new Set(instanceRows.map((row) => row.template_task_id))];

  const [{ data: templateTaskRows, error: templateTasksError }, { data: categoryRows, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("template_tasks")
        .select("*")
        .in("id", instanceTaskIds),
      supabase.from("task_categories").select("*").eq("family_id", profileRow.family_id),
    ]);

  if (templateTasksError || categoriesError || !templateTaskRows || !categoryRows) {
    return {
      weekday,
      template: ensured.template ? mapTemplate(ensured.template) : null,
      instances: movieInstance ? [movieInstance] : [],
      blocks: templateBlocks,
      dayContext,
      dailyPoints,
      rewardTiers: (rewardRows ?? []).map((row) => mapRewardTier(row as RewardTierRow)),
    };
  }

  const taskById = new Map(templateTaskRows.map((row) => [row.id, row as TemplateTaskRow]));
  const categoryById = new Map(categoryRows.map((row) => [row.id, row as CategoryRow]));
  const assignedProfileIds = [
    ...new Set(
      [
        ...instanceRows.map((row) => row.assigned_profile_id),
        ...templateTaskRows.map((task) => task.assigned_profile_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: assignedProfileRows } = assignedProfileIds.length
    ? await supabase.from("profiles").select("id, display_name, role").in("id", assignedProfileIds)
    : { data: [] as Array<{ id: string; display_name: string; role: "parent" | "child" | "viewer" }> };
  const assignedProfileById = new Map(
    (assignedProfileRows ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role,
      },
    ]),
  );
  const knowledgeCardIds = [
    ...new Set(
      templateTaskRows
        .map((task) => (task as TemplateTaskRow).knowledge_card_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: knowledgeRows } = knowledgeCardIds.length
    ? await supabase.from("knowledge_cards").select("id, title").in("id", knowledgeCardIds)
    : { data: [] as Pick<KnowledgeCardRow, "id" | "title">[] };
  const knowledgeTitleById = new Map((knowledgeRows ?? []).map((row) => [row.id, row.title]));

  const instances = instanceRows
    .map((row) => {
      const task = taskById.get(row.template_task_id);
      const category = task ? categoryById.get(task.category_id) : undefined;
      const assignedProfile = assignedProfileById.get(
        row.assigned_profile_id ?? task?.assigned_profile_id ?? "",
      );
      return mapInstance(
        row as TaskInstanceRow,
        task,
        category,
        assignedProfile ?? null,
        task?.knowledge_card_id ? knowledgeTitleById.get(task.knowledge_card_id) ?? null : null,
      );
    })
    .filter((entry): entry is TaskInstanceSummary => entry !== null)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.sortOrder - right.sortOrder;
    });

  const mergedInstances = movieInstance ? [...instances, movieInstance] : instances;
  const sortedInstances = mergedInstances.sort((left, right) => {
    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    return left.sortOrder - right.sortOrder;
  });

  return {
    weekday,
    template: ensured.template ? mapTemplate(ensured.template) : null,
    instances: sortedInstances,
    blocks: templateBlocks,
    dayContext,
    dailyPoints,
    rewardTiers: (rewardRows ?? []).map((row) => mapRewardTier(row as RewardTierRow)),
  };
}

export async function getTodayTemplateWithTasksForProfileV2(
  profileId: string,
  options?: {
    enabled?: boolean;
  },
): Promise<TodayTimelineV2Data> {
  const baseData = await getTodayTemplateWithTasksForProfile(profileId);
  return toTimelineV2Data(baseData, new Date(), options);
}

export async function getTodayPlanV2ForProfile(
  profileId: string,
  options?: {
    enabled?: boolean;
  },
): Promise<TodayTimelineV2Data> {
  return getTodayTemplateWithTasksForProfileV2(profileId, options);
}
