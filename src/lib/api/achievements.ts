import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getOrCreateDemoDailyPoints } from "@/lib/demo/gamification-store";
import {
  createDemoAchievementInstance,
  ensureDemoAchievementsCatalog,
  listDemoAchievementCategories,
  listDemoAchievementInstances,
  listDemoAchievements,
} from "@/lib/demo/achievements-store";
import {
  DEFAULT_ACHIEVEMENT_CATALOG,
  findUnlockableAchievements,
  parseAchievementCondition,
} from "@/lib/domain/achievements";
import type {
  AchievementCategorySummary,
  AchievementCategoryWithItems,
  AchievementInstanceSummary,
  AchievementSummary,
} from "@/lib/day-templates/types";
import { getDateKeyFromDate } from "@/lib/day-templates/date";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type AchievementCategoryRow = Database["public"]["Tables"]["achievement_categories"]["Row"];
type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
type AchievementInstanceRow = Database["public"]["Tables"]["achievement_instances"]["Row"];

type DailyPointsRow = Database["public"]["Tables"]["daily_points"]["Row"];
type TaskInstanceRow = Database["public"]["Tables"]["task_instances"]["Row"];

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

function mapAchievementCategory(row: AchievementCategoryRow): AchievementCategorySummary {
  return {
    id: row.id,
    familyId: row.family_id,
    code: row.code,
    label: row.label,
    colorKey: row.color_key,
  };
}

function mapAchievement(row: AchievementRow): AchievementSummary {
  const condition = parseAchievementCondition(row.condition) ?? {
    type: "daily_points_at_least",
    value: 999999,
  };

  return {
    id: row.id,
    categoryId: row.category_id,
    code: row.code,
    label: row.label,
    description: row.description,
    icon: row.icon,
    autoTrigger: row.auto_trigger,
    condition,
  };
}

function mapAchievementInstance(row: AchievementInstanceRow): AchievementInstanceSummary {
  return {
    id: row.id,
    achievementId: row.achievement_id,
    childProfileId: row.child_profile_id,
    unlockedAt: row.unlocked_at,
  };
}

export async function ensureAchievementCatalogForCurrentFamily(): Promise<void> {
  const family = await getFamilyContext();
  if (!family) {
    return;
  }

  if (!isSupabaseEnabled()) {
    ensureDemoAchievementsCatalog(family.familyId);
    return;
  }

  const supabase = await createSupabaseServerClient();

  for (const categorySeed of DEFAULT_ACHIEVEMENT_CATALOG) {
    const { data: categoryRow } = await supabase
      .from("achievement_categories")
      .upsert(
        {
          family_id: family.familyId,
          code: categorySeed.code,
          label: categorySeed.label,
          color_key: categorySeed.colorKey,
        },
        { onConflict: "family_id,code" },
      )
      .select("*")
      .single();

    if (!categoryRow) {
      continue;
    }

    for (const achievementSeed of categorySeed.achievements) {
      await supabase.from("achievements").upsert(
        {
          category_id: categoryRow.id,
          code: achievementSeed.code,
          label: achievementSeed.label,
          description: achievementSeed.description,
          icon: achievementSeed.icon,
          auto_trigger: achievementSeed.autoTrigger,
          condition: achievementSeed.condition as unknown as Json,
        },
        { onConflict: "category_id,code" },
      );
    }
  }
}

export async function getAchievementCatalogForCurrentFamily(): Promise<{
  categories: AchievementCategorySummary[];
  achievements: AchievementSummary[];
}> {
  const family = await getFamilyContext();
  if (!family) {
    return { categories: [], achievements: [] };
  }

  if (!isSupabaseEnabled()) {
    ensureDemoAchievementsCatalog(family.familyId);
    return {
      categories: listDemoAchievementCategories(family.familyId),
      achievements: listDemoAchievements(family.familyId),
    };
  }

  await ensureAchievementCatalogForCurrentFamily();

  const supabase = await createSupabaseServerClient();
  const [{ data: categoryRows }, { data: achievementRows }] = await Promise.all([
    supabase
      .from("achievement_categories")
      .select("*")
      .eq("family_id", family.familyId)
      .order("label", { ascending: true }),
    supabase
      .from("achievements")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const categoryIds = new Set((categoryRows ?? []).map((row) => row.id));

  return {
    categories: (categoryRows ?? []).map((row) => mapAchievementCategory(row as AchievementCategoryRow)),
    achievements: (achievementRows ?? [])
      .map((row) => mapAchievement(row as AchievementRow))
      .filter((achievement) => categoryIds.has(achievement.categoryId)),
  };
}

export async function getAchievementInstancesForCurrentChild(): Promise<AchievementInstanceSummary[]> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return [];
  }

  return getAchievementInstancesForChild(child.id);
}

export async function getAchievementInstancesForChild(
  childProfileId: string,
): Promise<AchievementInstanceSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    ensureDemoAchievementsCatalog(context.familyId);
    return listDemoAchievementInstances(context.familyId, childProfileId);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("achievement_instances")
    .select("*")
    .eq("child_profile_id", childProfileId)
    .order("unlocked_at", { ascending: false });

  return (data ?? []).map((row) => mapAchievementInstance(row as AchievementInstanceRow));
}

export async function getAchievementPageDataForCurrentChild(): Promise<{
  childId: string | null;
  categories: AchievementCategoryWithItems[];
  unlockedCount: number;
  totalCount: number;
  latestUnlockedLabel: string | null;
}> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return {
      childId: null,
      categories: [],
      unlockedCount: 0,
      totalCount: 0,
      latestUnlockedLabel: null,
    };
  }

  const [catalog, instances] = await Promise.all([
    getAchievementCatalogForCurrentFamily(),
    getAchievementInstancesForCurrentChild(),
  ]);

  const unlockedByAchievementId = new Map(
    instances.map((instance) => [instance.achievementId, instance.unlockedAt]),
  );

  const categories = catalog.categories.map((category) => {
    const achievements = catalog.achievements
      .filter((achievement) => achievement.categoryId === category.id)
      .sort((left, right) => left.label.localeCompare(right.label, "fr"))
      .map((achievement) => {
        const unlockedAt = unlockedByAchievementId.get(achievement.id) ?? null;
        return {
          ...achievement,
          unlockedAt,
          isUnlocked: Boolean(unlockedAt),
        };
      });

    return {
      ...category,
      achievements,
    };
  });

  const unlockedCount = categories.reduce(
    (count, category) => count + category.achievements.filter((achievement) => achievement.isUnlocked).length,
    0,
  );
  const totalCount = categories.reduce((count, category) => count + category.achievements.length, 0);

  const latestInstance = instances[0];
  const latestUnlockedLabel = latestInstance
    ? catalog.achievements.find((achievement) => achievement.id === latestInstance.achievementId)?.label ?? null
    : null;

  return {
    childId: child.id,
    categories,
    unlockedCount,
    totalCount,
    latestUnlockedLabel,
  };
}

export interface AchievementMetrics {
  dailyPointsToday: number;
  completedStreakDays: number;
  pomodorosCompleted: number;
}

function computeCompletedStreakFromRows(rows: Array<Pick<TaskInstanceRow, "date" | "status">>): number {
  if (rows.length === 0) {
    return 0;
  }

  const statusesByDate = new Map<string, TaskInstanceRow["status"][]>();
  rows.forEach((row) => {
    const bucket = statusesByDate.get(row.date) ?? [];
    bucket.push(row.status);
    statusesByDate.set(row.date, bucket);
  });

  const orderedDates = [...statusesByDate.keys()].sort((left, right) => right.localeCompare(left));
  let streak = 0;

  for (const date of orderedDates) {
    const statuses = statusesByDate.get(date) ?? [];
    if (statuses.length === 0) {
      break;
    }

    const isCompleteDay = statuses.every((status) => status === "termine" || status === "ignore");
    if (!isCompleteDay) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export async function getAchievementMetricsForChild(
  childProfileId: string,
): Promise<AchievementMetrics> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return {
      dailyPointsToday: 0,
      completedStreakDays: 0,
      pomodorosCompleted: 0,
    };
  }

  const todayKey = getDateKeyFromDate(new Date());

  if (!isSupabaseEnabled()) {
    const dailyPoints = getOrCreateDemoDailyPoints(context.familyId, childProfileId, todayKey);
    return {
      dailyPointsToday: dailyPoints.pointsTotal,
      completedStreakDays: dailyPoints.pointsTotal > 0 ? 1 : 0,
      pomodorosCompleted: 0,
    };
  }

  const supabase = await createSupabaseServerClient();
  const fromDate = getDateKeyFromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 20));

  const [{ data: dailyRow }, { data: taskRows }] = await Promise.all([
    supabase
      .from("daily_points")
      .select("*")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", childProfileId)
      .eq("date", todayKey)
      .maybeSingle(),
    supabase
      .from("task_instances")
      .select("date,status")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", childProfileId)
      .gte("date", fromDate)
      .lte("date", todayKey)
      .order("date", { ascending: false }),
  ]);

  const dailyPointsToday = (dailyRow as DailyPointsRow | null)?.points_total ?? 0;
  const completedStreakDays = computeCompletedStreakFromRows((taskRows ?? []) as Array<Pick<TaskInstanceRow, "date" | "status">>);

  return {
    dailyPointsToday,
    completedStreakDays,
    pomodorosCompleted: 0,
  };
}

export async function evaluateAchievementsForChild(
  childProfileId: string,
): Promise<AchievementSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId) {
    return [];
  }

  const [catalog, instances, metrics] = await Promise.all([
    getAchievementCatalogForCurrentFamily(),
    getAchievementInstancesForChild(childProfileId),
    getAchievementMetricsForChild(childProfileId),
  ]);

  const unlockable = findUnlockableAchievements({
    achievements: catalog.achievements,
    alreadyUnlockedAchievementIds: instances.map((instance) => instance.achievementId),
    metrics,
  });

  if (unlockable.length === 0) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    unlockable.forEach((achievement) => {
      createDemoAchievementInstance(context.familyId!, childProfileId, achievement.id);
    });

    return unlockable;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("achievement_instances").insert(
    unlockable.map((achievement) => ({
      achievement_id: achievement.id,
      child_profile_id: childProfileId,
    })),
  );

  return unlockable;
}
