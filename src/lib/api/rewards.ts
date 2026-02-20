import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getOrCreateDemoDailyPoints, listDemoRewardTiers } from "@/lib/demo/gamification-store";
import type { DailyPointsSummary, RewardTierSummary } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RewardTierRow = Database["public"]["Tables"]["reward_tiers"]["Row"];
type DailyPointsRow = Database["public"]["Tables"]["daily_points"]["Row"];

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

export async function getRewardTiersForCurrentFamily(): Promise<RewardTierSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoRewardTiers(context.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("*")
    .eq("family_id", context.familyId)
    .order("points_required", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRewardTier(row as RewardTierRow));
}

export async function getTodayDailyPointsForChild(childProfileId: string): Promise<DailyPointsSummary | null> {
  if (!childProfileId) {
    return null;
  }

  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (!isSupabaseEnabled()) {
    return getOrCreateDemoDailyPoints(context.familyId, childProfileId, dateKey);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_points")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .eq("date", dateKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapDailyPoints(data as DailyPointsRow);
}

export interface ParentTodayPointsOverview {
  childDisplayName: string;
  pointsTotal: number;
  reachedTierLabel: string | null;
}

export async function getParentTodayPointsOverview(): Promise<ParentTodayPointsOverview | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || context.role !== "parent") {
    return null;
  }

  const tiers = await getRewardTiersForCurrentFamily();
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (!isSupabaseEnabled()) {
    const childProfileId = "dev-child-id";
    const daily = getOrCreateDemoDailyPoints(context.familyId, childProfileId, dateKey);
    const reachedTier =
      [...tiers]
        .sort((left, right) => left.pointsRequired - right.pointsRequired)
        .filter((tier) => tier.pointsRequired <= daily.pointsTotal)
        .at(-1) ?? null;

    return {
      childDisplayName: "Ezra",
      pointsTotal: daily.pointsTotal,
      reachedTierLabel: reachedTier?.label ?? null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: childProfile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("family_id", context.familyId)
    .eq("role", "child")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!childProfile) {
    return null;
  }

  const { data: daily } = await supabase
    .from("daily_points")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfile.id)
    .eq("date", dateKey)
    .maybeSingle();

  const pointsTotal = daily?.points_total ?? 0;
  const reachedTier =
    [...tiers]
      .sort((left, right) => left.pointsRequired - right.pointsRequired)
      .filter((tier) => tier.pointsRequired <= pointsTotal)
      .at(-1) ?? null;

  return {
    childDisplayName: childProfile.display_name,
    pointsTotal,
    reachedTierLabel: reachedTier?.label ?? null,
  };
}
