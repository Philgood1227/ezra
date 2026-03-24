import { seedEzraCategoryPackAction } from "@/lib/actions/day-templates";
import {
  getTaskCategoriesForCurrentFamily,
  getTemplateByIdForCurrentFamily,
  getTemplateWeekOverviewForCurrentFamily,
} from "@/lib/api/templates";
import { parseCategoryCode } from "@/lib/day-templates/constants";
import type { CategoryCode, TaskCategorySummary } from "@/lib/day-templates/types";
import { PleasureActivitiesManager } from "./pleasure-activities-manager";

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

export default async function ParentV2PleasureActivitiesPage(): Promise<React.JSX.Element> {
  const [overview, initialCategories] = await Promise.all([
    getTemplateWeekOverviewForCurrentFamily(),
    getTaskCategoriesForCurrentFamily(),
  ]);

  let categories = initialCategories;
  if (!hasRequiredCategoryCodes(categories, REQUIRED_EXTRA_CODES)) {
    const seeded = await seedEzraCategoryPackAction();
    if (seeded.success) {
      categories = await getTaskCategoriesForCurrentFamily();
    }
  }

  const templateIds = overview
    .map((day) => day.defaultTemplate?.id ?? null)
    .filter((id): id is string => Boolean(id));
  const templatesWithTasks = await Promise.all(templateIds.map((templateId) => getTemplateByIdForCurrentFamily(templateId)));
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
    tasks: day.defaultTemplate ? templateById.get(day.defaultTemplate.id)?.tasks ?? [] : [],
  }));

  return (
    <section className="pleasure-activities-theme p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold text-gray-900">Activites plaisir</h1>
        <p className="text-gray-600">Gerez les activites recreatives et de detente de votre enfant</p>
      </div>

      <PleasureActivitiesManager days={days} categories={categories} />
    </section>
  );
}
