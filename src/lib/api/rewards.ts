import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  getDemoRewardStarsBalance,
  getDemoRewardClaimsSnapshot,
  getOrCreateDemoDailyPoints,
  listDemoRewardTiers,
} from "@/lib/demo/gamification-store";
import type { DailyPointsSummary, RewardTierSummary } from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RewardTierRow = Database["public"]["Tables"]["reward_tiers"]["Row"];
type DailyPointsRow = Database["public"]["Tables"]["daily_points"]["Row"];
type RewardClaimRow = Database["public"]["Tables"]["reward_claims"]["Row"];

function shouldUseAdminClientForChildPin(
  context: Awaited<ReturnType<typeof getCurrentProfile>>,
): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

async function getSupabaseClientForContext(
  context: Awaited<ReturnType<typeof getCurrentProfile>>,
) {
  return shouldUseAdminClientForChildPin(context)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
}

export interface RewardClaimsSnapshot {
  spentToday: number;
  historyByRewardTier: Record<
    string,
    {
      count: number;
      lastClaimedAt: string;
    }
  >;
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

export async function getRewardClaimsSnapshotForChild(
  childProfileId: string,
  dateKey: string,
): Promise<RewardClaimsSnapshot> {
  const emptySnapshot: RewardClaimsSnapshot = {
    spentToday: 0,
    historyByRewardTier: {},
  };

  if (!childProfileId || !dateKey) {
    return emptySnapshot;
  }

  const context = await getCurrentProfile();
  if (!context.familyId) {
    return emptySnapshot;
  }

  if (!isSupabaseEnabled()) {
    return getDemoRewardClaimsSnapshot(context.familyId, childProfileId, dateKey);
  }

  const supabase = await getSupabaseClientForContext(context);
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .order("claimed_at", { ascending: false });

  if (error || !data) {
    return emptySnapshot;
  }

  const historyByRewardTier: RewardClaimsSnapshot["historyByRewardTier"] = {};
  let spentToday = 0;

  for (const claim of data as RewardClaimRow[]) {
    if (claim.claim_date === dateKey) {
      spentToday += Math.max(0, Math.trunc(claim.points_spent));
    }

    const existing = historyByRewardTier[claim.reward_tier_id];
    if (!existing) {
      historyByRewardTier[claim.reward_tier_id] = {
        count: 1,
        lastClaimedAt: claim.claimed_at,
      };
      continue;
    }

    historyByRewardTier[claim.reward_tier_id] = {
      count: existing.count + 1,
      lastClaimedAt: existing.lastClaimedAt,
    };
  }

  return {
    spentToday: Math.max(0, Math.trunc(spentToday)),
    historyByRewardTier,
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

  const supabase = await getSupabaseClientForContext(context);
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

  const supabase = await getSupabaseClientForContext(context);
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

export interface RewardStarsBalance {
  earnedStarsTotal: number;
  spentStarsTotal: number;
  availableStars: number;
}

export async function getRewardStarsBalanceForChild(childProfileId: string): Promise<RewardStarsBalance> {
  const emptyBalance: RewardStarsBalance = {
    earnedStarsTotal: 0,
    spentStarsTotal: 0,
    availableStars: 0,
  };

  if (!childProfileId) {
    return emptyBalance;
  }

  const context = await getCurrentProfile();
  if (!context.familyId) {
    return emptyBalance;
  }

  if (!isSupabaseEnabled()) {
    return getDemoRewardStarsBalance(context.familyId, childProfileId);
  }

  const supabase = await getSupabaseClientForContext(context);
  const [{ data: dailyRows, error: dailyError }, { data: claimRows, error: claimsError }] =
    await Promise.all([
      supabase
        .from("daily_points")
        .select("points_total")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", childProfileId),
      supabase
        .from("reward_claims")
        .select("points_spent")
        .eq("family_id", context.familyId)
        .eq("child_profile_id", childProfileId),
    ]);

  if (dailyError || claimsError) {
    return emptyBalance;
  }

  const earnedStarsTotal = (dailyRows ?? []).reduce((total, row) => {
    return total + Math.max(0, Math.trunc(row.points_total ?? 0));
  }, 0);
  const spentStarsTotal = (claimRows ?? []).reduce((total, row) => {
    return total + Math.max(0, Math.trunc(row.points_spent ?? 0));
  }, 0);

  return {
    earnedStarsTotal,
    spentStarsTotal,
    availableStars: Math.max(0, earnedStarsTotal - spentStarsTotal),
  };
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
