import { Card, CardContent, EmptyState } from "@/components/ds";
import { ParentMealsManager } from "@/features/meals/components";
import { getParentMealsPageData } from "@/lib/api/meals";

interface ParentMealsPageProps {
  searchParams: Promise<{
    weekStart?: string;
  }>;
}

export default async function ParentMealsPage({
  searchParams,
}: ParentMealsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const data = await getParentMealsPageData(params.weekStart);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Organisation</p>
          <h1 className="font-display text-2xl font-black text-text-primary">Repas</h1>
        </CardContent>
      </Card>

      {!data.child ? (
        <EmptyState
          icon="🍽️"
          title="Aucun profil enfant trouve"
          description="Ajoutez un profil enfant pour planifier les repas."
        />
      ) : (
        <ParentMealsManager
          childName={data.child.displayName}
          weekStart={data.weekStart}
          weekDateKeys={data.weekDateKeys}
          meals={data.meals}
          ingredients={data.ingredients}
          recipes={data.recipes}
          weeklyIngredients={data.weeklyIngredients}
        />
      )}
    </section>
  );
}

