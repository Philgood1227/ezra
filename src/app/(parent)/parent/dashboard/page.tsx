import { Card, CardContent, EmptyState } from "@/components/ds";
import { ParentDashboardView } from "@/features/dashboard/components";
import { getParentDashboardPageData } from "@/lib/api/dashboard";

interface ParentDashboardPageProps {
  searchParams: Promise<{
    weekStart?: string;
  }>;
}

export default async function ParentDashboardPage({
  searchParams,
}: ParentDashboardPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const data = await getParentDashboardPageData(params.weekStart);

  if (!data.child || !data.summary) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent>
            <EmptyState
              icon="📊"
              title="Aucune donnee disponible pour le moment"
              description="Ajoutez un profil enfant et des elements de planning pour alimenter le tableau de bord."
            />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <ParentDashboardView
      childName={data.child.displayName}
      weekStart={data.weekStart}
      summary={data.summary}
      schoolDiaryCount={data.schoolDiaryCount}
      schoolDiaryUpcoming={data.schoolDiaryUpcoming}
    />
  );
}

