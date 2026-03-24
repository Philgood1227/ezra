import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ds";
import { DayTemplateEditor } from "@/features/day-templates/components";
import { getTemplateByIdForCurrentFamily } from "@/lib/api/templates";

interface DayTemplateEditorPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    weekday?: string;
  }>;
}

function parseWeekday(rawValue: string | undefined): number {
  const parsed = Number(rawValue);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
    return parsed;
  }
  return new Date().getDay();
}

export default async function DayTemplateEditorPage({
  params,
  searchParams,
}: DayTemplateEditorPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const isNew = resolvedParams.id === "new";

  const template = isNew ? null : await getTemplateByIdForCurrentFamily(resolvedParams.id);

  if (!isNew && !template) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Journees types</p>
            <h1 className="font-display text-2xl font-black text-text-primary">
              {isNew ? "Nouvelle journee type" : "Edition de la journee type"}
            </h1>
          </div>
          <Link
            href="/parent/day-templates"
            className="inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition hover:bg-bg-surface-hover"
          >
            Retour a la liste
          </Link>
        </CardContent>
      </Card>

      <DayTemplateEditor
        categories={[]}
        template={template}
        mode="structure"
        initialWeekday={template?.weekday ?? parseWeekday(resolvedSearchParams.weekday)}
        knowledgeCardOptions={[]}
      />
    </section>
  );
}
