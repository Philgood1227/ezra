import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { CategoriesManager } from "@/features/day-templates/components";
import { ChecklistTemplatesManager } from "@/features/school-diary/components";
import {
  getChecklistTemplatesForCurrentFamily,
  getScheduledChecklistsForCurrentFamily,
} from "@/lib/api/checklists";
import { getTaskCategoriesForCurrentFamily } from "@/lib/api/templates";

export default async function ParentV2SettingsPage(): Promise<React.JSX.Element> {
  const [categories, checklistTemplates, scheduledInstances] = await Promise.all([
    getTaskCategoriesForCurrentFamily(),
    getChecklistTemplatesForCurrentFamily(),
    getScheduledChecklistsForCurrentFamily(),
  ]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Parametres parents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>
            Administrez ici les categories, icones et routines utilisees dans Missions d'ecole,
            Activites plaisir, Journees types et Checklists.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Categories modules</h2>
        <CategoriesManager categories={categories} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Checklists et routines recurrentes</h2>
        <ChecklistTemplatesManager templates={checklistTemplates} scheduledInstances={scheduledInstances} />
      </div>
    </section>
  );
}
