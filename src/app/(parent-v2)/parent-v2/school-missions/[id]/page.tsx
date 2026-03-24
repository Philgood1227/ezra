import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent } from "@/components/ds";
import { DayTemplateEditor } from "@/features/day-templates/components";
import { seedEzraCategoryPackAction } from "@/lib/actions/day-templates";
import { getKnowledgeCardOptionsForCurrentFamily } from "@/lib/api/knowledge";
import {
  getTaskCategoriesForCurrentFamily,
  getTemplateByIdForCurrentFamily,
} from "@/lib/api/templates";
import { getWeekdayLabel, parseCategoryCode } from "@/lib/day-templates/constants";
import type { CategoryCode, TaskCategorySummary } from "@/lib/day-templates/types";

interface ParentV2SchoolMissionsEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

const linkButtonClass =
  "school-missions-link-btn inline-flex h-touch-sm items-center justify-center rounded-radius-button border px-3 text-sm font-semibold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const REQUIRED_SCHOOL_CODES: readonly CategoryCode[] = ["homework", "revision", "training"];

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

export default async function ParentV2SchoolMissionsEditorPage({
  params,
}: ParentV2SchoolMissionsEditorPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;

  const [initialCategories, knowledgeCardOptions, template] = await Promise.all([
    getTaskCategoriesForCurrentFamily(),
    getKnowledgeCardOptionsForCurrentFamily(),
    getTemplateByIdForCurrentFamily(resolvedParams.id),
  ]);

  let categories = initialCategories;

  if (!hasRequiredCategoryCodes(categories, REQUIRED_SCHOOL_CODES)) {
    const seeded = await seedEzraCategoryPackAction();
    if (seeded.success) {
      categories = await getTaskCategoriesForCurrentFamily();
    }
  }

  if (!template) {
    notFound();
  }

  return (
    <section className="school-missions-theme mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="school-missions-hero">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="school-missions-page-subtitle text-sm">Missions d&apos;ecole</p>
            <h1 className="school-missions-page-title font-display text-2xl font-black">
              {template.name} - {getWeekdayLabel(template.weekday)}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info" className="school-missions-chip">
                Edition active
              </Badge>
              <Badge variant="ecole" className="school-missions-chip">
                Devoirs - Revisions - Entrainement
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent-v2/school-missions" className={linkButtonClass}>
              Retour aux missions
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
        taskScope="school"
        initialWeekday={template.weekday}
        knowledgeCardOptions={knowledgeCardOptions}
      />
    </section>
  );
}
