import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { SetPinForm } from "@/features/auth/components";
import { CategoriesManager } from "@/features/day-templates/components";
import { ChecklistTemplatesManager } from "@/features/school-diary/components";
import {
  getChecklistTemplatesForCurrentFamily,
  getScheduledChecklistsForCurrentFamily,
} from "@/lib/api/checklists";
import { getFamilyMembersForCurrentFamily } from "@/lib/api/children";
import { getTaskCategoriesForCurrentFamily } from "@/lib/api/templates";

export default async function ParentV2SettingsPage(): Promise<React.JSX.Element> {
  const [categories, checklistTemplates, scheduledInstances, familyMembers] = await Promise.all([
    getTaskCategoriesForCurrentFamily(),
    getChecklistTemplatesForCurrentFamily(),
    getScheduledChecklistsForCurrentFamily(),
    getFamilyMembersForCurrentFamily(),
  ]);
  const childMembers = familyMembers.filter((member) => member.role === "child");

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Parametres parents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>
            Administrez ici les categories, icones et routines utilisees dans Missions d&apos;ecole,
            Activites plaisir, Journees types et Checklists.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil enfant lie au parent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Creez un profil enfant (ou mettez a jour son PIN). Il sera automatiquement lie a votre
            famille parent connectee.
          </p>
          <SetPinForm />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary">Profils enfants de la famille</p>
            {childMembers.length > 0 ? (
              <ul className="space-y-1 text-sm text-text-secondary">
                {childMembers.map((child) => (
                  <li key={child.id}>{child.displayName}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Aucun profil enfant pour le moment.</p>
            )}
          </div>
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
