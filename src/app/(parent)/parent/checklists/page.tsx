import { Card, CardContent } from "@/components/ds";
import { ChecklistTemplatesManager } from "@/features/school-diary/components";
import { getChecklistTemplatesForCurrentFamily } from "@/lib/api/checklists";

export default async function ParentChecklistsPage(): Promise<React.JSX.Element> {
  const templates = await getChecklistTemplatesForCurrentFamily();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary">Organisation</p>
          <h1 className="font-display text-2xl font-black text-text-primary">Modeles de checklists</h1>
        </CardContent>
      </Card>
      <ChecklistTemplatesManager templates={templates} />
    </section>
  );
}

