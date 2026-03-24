import { ChecklistTemplatesManager } from "@/features/school-diary/components";
import {
  getChecklistTemplatesForCurrentFamily,
  getScheduledChecklistsForCurrentFamily,
} from "@/lib/api/checklists";

export default async function ParentV2ChecklistsPage(): Promise<React.JSX.Element> {
  const [templates, scheduledInstances] = await Promise.all([
    getChecklistTemplatesForCurrentFamily(),
    getScheduledChecklistsForCurrentFamily(),
  ]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ChecklistTemplatesManager templates={templates} scheduledInstances={scheduledInstances} />
    </section>
  );
}
