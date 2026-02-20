import { Card, CardContent } from "@/components/ds";
import { ParentAchievementsManager } from "@/features/achievements/components";
import { getAchievementCatalogForCurrentFamily } from "@/lib/api/achievements";

export default async function ParentAchievementsPage(): Promise<React.JSX.Element> {
  const catalog = await getAchievementCatalogForCurrentFamily();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Vie familiale & motivation</p>
          <h1 className="font-display text-2xl font-black text-text-primary">Succes & badges</h1>
        </CardContent>
      </Card>
      <ParentAchievementsManager categories={catalog.categories} achievements={catalog.achievements} />
    </section>
  );
}

