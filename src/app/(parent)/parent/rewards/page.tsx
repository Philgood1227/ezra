import { Card, CardContent } from "@/components/ds";
import { RewardsManager } from "@/features/day-templates/components";
import { getRewardTiersForCurrentFamily } from "@/lib/api/rewards";

export default async function ParentRewardsPage(): Promise<React.JSX.Element> {
  const rewardTiers = await getRewardTiersForCurrentFamily();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Vie familiale & motivation</p>
          <h1 className="font-display text-2xl font-black text-text-primary">Recompenses</h1>
        </CardContent>
      </Card>
      <RewardsManager rewardTiers={rewardTiers} />
    </section>
  );
}

