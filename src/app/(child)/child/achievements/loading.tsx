import { ChildAchievementsView } from "@/components/child/achievements";

export default function ChildAchievementsLoading(): React.JSX.Element {
  return <ChildAchievementsView categories={[]} unlockedCount={0} totalCount={0} isLoading />;
}

