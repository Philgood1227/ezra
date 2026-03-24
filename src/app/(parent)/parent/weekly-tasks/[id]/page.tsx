import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ds";
import { DayTemplateEditor } from "@/features/day-templates/components";
import { getKnowledgeCardOptionsForCurrentFamily } from "@/lib/api/knowledge";
import { getTaskCategoriesForCurrentFamily, getTemplateByIdForCurrentFamily } from "@/lib/api/templates";
import { getWeekdayLabel } from "@/lib/day-templates/constants";

interface WeeklyTasksEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WeeklyTasksEditorPage({
  params,
}: WeeklyTasksEditorPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;

  const [categories, knowledgeCardOptions, template] = await Promise.all([
    getTaskCategoriesForCurrentFamily(),
    getKnowledgeCardOptionsForCurrentFamily(),
    getTemplateByIdForCurrentFamily(resolvedParams.id),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Taches hebdomadaires</p>
            <h1 className="font-display text-2xl font-black text-text-primary">
              {template.name} · {getWeekdayLabel(template.weekday)}
            </h1>
          </div>
          <Link
            href="/parent/weekly-tasks"
            className="inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition hover:bg-bg-surface-hover"
          >
            Retour aux taches
          </Link>
        </CardContent>
      </Card>

      <DayTemplateEditor
        categories={categories}
        template={template}
        mode="tasks"
        initialWeekday={template.weekday}
        knowledgeCardOptions={knowledgeCardOptions}
      />
    </section>
  );
}
