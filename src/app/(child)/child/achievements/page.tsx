import { ChildAchievementsView } from "@/components/child/achievements";
import { getAchievementPageDataForCurrentChild } from "@/lib/api/achievements";

export default async function ChildAchievementsPage(): Promise<React.JSX.Element> {
  const data = await getAchievementPageDataForCurrentChild();

  return (
    <ChildAchievementsView
      categories={data.categories}
      unlockedCount={data.unlockedCount}
      totalCount={data.totalCount}
    />
  );
}
