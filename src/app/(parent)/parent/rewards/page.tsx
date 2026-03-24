import { RewardsManager } from "@/features/day-templates/components";
import { getRewardTiersForCurrentFamily } from "@/lib/api/rewards";

export default async function ParentRewardsPage(): Promise<React.JSX.Element> {
  const rewardTiers = await getRewardTiersForCurrentFamily();

  return <RewardsManager rewardTiers={rewardTiers} />;
}
