import Link from "next/link";
import { Badge, Card, CardContent } from "@/components/ds";
import { seedEzraCategoryPackAction } from "@/lib/actions/day-templates";
import {
  getTaskCategoriesForCurrentFamily,
  getTemplateByIdForCurrentFamily,
  getTemplateWeekOverviewForCurrentFamily,
} from "@/lib/api/templates";
import { parseCategoryCode } from "@/lib/day-templates/constants";
import type { CategoryCode, TaskCategorySummary } from "@/lib/day-templates/types";
import { SchoolMissionsManager } from "./school-missions-manager";

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

export default async function ParentV2SchoolMissionsPage(): Promise<React.JSX.Element> {
  const [overview, initialCategories] = await Promise.all([
    getTemplateWeekOverviewForCurrentFamily(),
    getTaskCategoriesForCurrentFamily(),
  ]);

  let categories = initialCategories;
  if (!hasRequiredCategoryCodes(categories, REQUIRED_SCHOOL_CODES)) {
    const seeded = await seedEzraCategoryPackAction();
    if (seeded.success) {
      categories = await getTaskCategoriesForCurrentFamily();
    }
  }

  const templateIds = overview
    .map((day) => day.defaultTemplate?.id ?? null)
    .filter((id): id is string => Boolean(id));
  const templatesWithTasks = await Promise.all(
    templateIds.map((templateId) => getTemplateByIdForCurrentFamily(templateId)),
  );
  const templateById = new Map(
    templatesWithTasks
      .filter((template): template is NonNullable<typeof template> => Boolean(template))
      .map((template) => [template.id, template]),
  );

  const days = overview.map((day) => ({
    weekday: day.weekday,
    weekdayLabel: day.weekdayLabel,
    templateId: day.defaultTemplate?.id ?? null,
    templateName: day.defaultTemplate?.name ?? null,
    tasks: day.defaultTemplate ? (templateById.get(day.defaultTemplate.id)?.tasks ?? []) : [],
  }));

  return (
    <section className="school-missions-theme mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="school-missions-page-title text-3xl font-extrabold tracking-tight">
          Missions d&apos;ecole
        </h1>
        <p className="school-missions-page-subtitle text-sm">
          Configurez devoirs, revisions et entrainements de la semaine. Ces donnees alimentent
          directement le tableau des quetes enfant.
        </p>
      </div>

      <Card className="school-missions-hero">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <p className="school-missions-page-subtitle text-sm">Vue missions d&apos;ecole v2</p>
            <h2 className="font-display text-2xl font-black text-text-primary">
              Agenda hebdomadaire + creation directe
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info" className="school-missions-chip">
                Missions FR / MATH / DE
              </Badge>
              <Badge variant="ecole" className="school-missions-chip">
                Flux parent vers enfant actif
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent-v2/pleasure-activities" className={linkButtonClass}>
              Activites plaisir
            </Link>
            <Link href="/parent-v2/calendar" className={linkButtonClass}>
              Ouvrir calendrier
            </Link>
          </div>
        </CardContent>
      </Card>

      <SchoolMissionsManager days={days} categories={categories} />
    </section>
  );
}
