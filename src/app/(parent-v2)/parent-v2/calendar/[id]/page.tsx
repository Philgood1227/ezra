import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent } from "@/components/ds";
import { DayTemplateEditor } from "@/features/day-templates/components";
import { getTemplateByIdForCurrentFamily } from "@/lib/api/templates";

interface ParentV2CalendarEditorPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    weekday?: string;
  }>;
}

const linkButtonClass =
  "inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition-all hover:-translate-y-0.5 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

function parseWeekday(rawValue: string | undefined): number {
  const parsed = Number(rawValue);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
    return parsed;
  }
  return new Date().getDay();
}

export default async function ParentV2CalendarEditorPage({
  params,
  searchParams,
}: ParentV2CalendarEditorPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const isNew = resolvedParams.id === "new";

  const template = isNew ? null : await getTemplateByIdForCurrentFamily(resolvedParams.id);

  if (!isNew && !template) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Calendrier</p>
            <h1 className="font-display text-2xl font-black text-text-primary">
              {isNew ? "Nouvelle journee type" : "Edition de la journee type"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info">{isNew ? "Creation" : "Edition"}</Badge>
              <Badge variant="neutral">Structure long terme</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent-v2/calendar" className={linkButtonClass}>
              Retour au calendrier
            </Link>
            <Link href="/child" className={linkButtonClass}>
              Voir comme l&apos;enfant
            </Link>
          </div>
        </CardContent>
      </Card>

      <DayTemplateEditor
        categories={[]}
        template={template}
        mode="structure"
        initialWeekday={template?.weekday ?? parseWeekday(resolvedSearchParams.weekday)}
        templateBasePath="/parent-v2/calendar"
        knowledgeCardOptions={[]}
      />
    </section>
  );
}
