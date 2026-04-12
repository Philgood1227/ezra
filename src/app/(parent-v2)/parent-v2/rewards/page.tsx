import { RewardsManager } from "@/features/day-templates/components";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getRewardStarsBalanceForChild, getRewardTiersForCurrentFamily } from "@/lib/api/rewards";

export default async function ParentV2RewardsPage(): Promise<React.JSX.Element> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  const [rewardTiers, childStarsBalance] = await Promise.all([
    getRewardTiersForCurrentFamily(),
    child ? getRewardStarsBalanceForChild(child.id) : Promise.resolve(null),
  ]);

  return (
    <RewardsManager
      rewardTiers={rewardTiers}
      childRewardWallet={
        child && childStarsBalance
          ? {
              childProfileId: child.id,
              childDisplayName: child.displayName,
              availableStars: childStarsBalance.availableStars,
            }
          : null
      }
    />
  );
}
