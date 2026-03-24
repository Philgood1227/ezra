import { RewardsManager } from "@/features/day-templates/components";
import { getRewardTiersForCurrentFamily } from "@/lib/api/rewards";

export default async function ParentV2RewardsPage(): Promise<React.JSX.Element> {
  const rewardTiers = await getRewardTiersForCurrentFamily();

  return <RewardsManager rewardTiers={rewardTiers} />;
}
