import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent } from "@/components/ds";
import { DayTemplateEditor } from "@/features/day-templates/components";
import { seedEzraCategoryPackAction } from "@/lib/actions/day-templates";
import { getKnowledgeCardOptionsForCurrentFamily } from "@/lib/api/knowledge";
import { getTaskCategoriesForCurrentFamily, getTemplateByIdForCurrentFamily } from "@/lib/api/templates";
import { getWeekdayLabel, parseCategoryCode } from "@/lib/day-templates/constants";
import type { CategoryCode, TaskCategorySummary } from "@/lib/day-templates/types";

interface ParentV2PleasureActivitiesEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

const linkButtonClass =
  "inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition-all hover:-translate-y-0.5 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const REQUIRED_EXTRA_CODES: readonly CategoryCode[] = ["activity", "routine", "leisure"];

function hasRequiredCategoryCodes(
  categories: TaskCategorySummary[],
  requiredCodes: readonly CategoryCode[],
): boolean {
  const presentCodes = new Set<CategoryCode>();

  for (const category of categories) {
    const code = parseCategoryCode(category.code ?? null);
    if (code) {
      presentCodes.add(code);
    }
  }

  return requiredCodes.every((code) => presentCodes.has(code));
}

export default async function ParentV2PleasureActivitiesEditorPage({
  params,
}: ParentV2PleasureActivitiesEditorPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;

  const [initialCategories, knowledgeCardOptions, template] = await Promise.all([
    getTaskCategoriesForCurrentFamily(),
    getKnowledgeCardOptionsForCurrentFamily(),
    getTemplateByIdForCurrentFamily(resolvedParams.id),
  ]);

  let categories = initialCategories;

  if (!hasRequiredCategoryCodes(categories, REQUIRED_EXTRA_CODES)) {
    const seeded = await seedEzraCategoryPackAction();
    if (seeded.success) {
      categories = await getTaskCategoriesForCurrentFamily();
    }
  }

  if (!template) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Activites plaisir</p>
            <h1 className="font-display text-2xl font-black text-text-primary">
              {template.name} - {getWeekdayLabel(template.weekday)}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="success">Edition active</Badge>
              <Badge variant="loisir">Loisirs - Activites extras</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent-v2/pleasure-activities" className={linkButtonClass}>
              Retour aux activites
            </Link>
            <Link href="/child" className={linkButtonClass}>
              Voir comme l&apos;enfant
            </Link>
          </div>
        </CardContent>
      </Card>

      <DayTemplateEditor
        categories={categories}
        template={template}
        mode="tasks"
        taskScope="extra"
        initialWeekday={template.weekday}
        knowledgeCardOptions={knowledgeCardOptions}
      />
    </section>
  );
}
