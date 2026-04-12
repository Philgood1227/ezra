import { ChildRewardsView } from "@/components/child/rewards/child-rewards-view";
import {
  getRewardClaimsSnapshotForChild,
  getRewardStarsBalanceForChild,
  getRewardTiersForCurrentFamily,
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

  const [rewardTiers, starsBalance, rewardClaimsSnapshot] = childProfileId
    ? await Promise.all([
        getRewardTiersForCurrentFamily(),
        getRewardStarsBalanceForChild(childProfileId),
        getRewardClaimsSnapshotForChild(childProfileId, dateKey),
      ])
    : [[], { earnedStarsTotal: 0, spentStarsTotal: 0, availableStars: 0 }, { spentToday: 0, historyByRewardTier: {} }];

  return (
    <ChildRewardsView
      childName={getFirstName(context.profile?.display_name)}
      initialAvailableStars={starsBalance.availableStars}
      initialRewardHistory={rewardClaimsSnapshot.historyByRewardTier}
      rewardTiers={rewardTiers}
    />
  );
}
