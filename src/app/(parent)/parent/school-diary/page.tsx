import { Card, CardContent, EmptyState } from "@/components/ds";
import { SchoolDiaryManager } from "@/features/school-diary/components";
import { getSchoolDiaryPageData } from "@/lib/api/school-diary";

export default async function ParentSchoolDiaryPage(): Promise<React.JSX.Element> {
  const { child, entries } = await getSchoolDiaryPageData();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Organisation</p>
          <h1 className="font-display text-2xl font-black text-text-primary">Carnet scolaire</h1>
        </CardContent>
      </Card>

      {child ? (
        <SchoolDiaryManager childName={child.displayName} entries={entries} />
      ) : (
        <EmptyState
          icon="📘"
          title="Aucun profil enfant trouve"
          description="Creez d'abord un profil enfant dans les parametres."
        />
      )}
    </section>
  );
}

