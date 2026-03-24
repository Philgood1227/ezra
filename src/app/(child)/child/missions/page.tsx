import { ChildRewardsView } from "@/components/child/rewards/child-rewards-view";
import {
  getRewardClaimsSnapshotForChild,
  getRewardTiersForCurrentFamily,
  getTodayDailyPointsForChild,
} from "@/lib/api/rewards";
import { getCurrentProfile } from "@/lib/auth/current-profile";

function getFirstName(displayName: string | null | undefined): string {
  if (!displayName) {
    return "Ezra";
  }

  const normalized = displayName.trim();
  if (!normalized) {
    return "Ezra";
  }

  return normalized.split(/\s+/)[0] ?? "Ezra";
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default async function ChildRewardsPage(): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  const childProfileId = context.profile?.id ?? "";
  const dateKey = getTodayDateKey();

  const [rewardTiers, dailyPoints, rewardClaimsSnapshot] = childProfileId
    ? await Promise.all([
        getRewardTiersForCurrentFamily(),
        getTodayDailyPointsForChild(childProfileId),
        getRewardClaimsSnapshotForChild(childProfileId, dateKey),
      ])
    : [[], null, { spentToday: 0, historyByRewardTier: {} }];

  return (
    <ChildRewardsView
      childName={getFirstName(context.profile?.display_name)}
      initialStars={dailyPoints?.pointsTotal ?? 0}
      initialSpentToday={rewardClaimsSnapshot.spentToday}
      initialRewardHistory={rewardClaimsSnapshot.historyByRewardTier}
      rewardTiers={rewardTiers}
    />
  );
}
