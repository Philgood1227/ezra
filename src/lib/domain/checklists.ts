import { getDateKeyFromDate } from "@/lib/day-templates/date";
import type {
  ChecklistInstanceItemSummary,
  ChecklistTemplateSummary,
  ChecklistTemplateType,
  SchoolDiaryEntrySummary,
} from "@/lib/day-templates/types";

export interface GeneratedChecklistDraft {
  type: ChecklistTemplateType;
  label: string;
  date: string;
  templateId: string | null;
  items: Array<Pick<ChecklistInstanceItemSummary, "label" | "sortOrder">>;
}

export function mapDiaryTypeToChecklistType(
  type: SchoolDiaryEntrySummary["type"],
): ChecklistTemplateType {
  switch (type) {
    case "piscine":
      return "piscine";
    case "sortie":
      return "sortie";
    case "evaluation":
      return "evaluation";
    case "devoir":
      return "quotidien";
    case "info":
    default:
      return "autre";
  }
}

function defaultChecklistLabel(entry: SchoolDiaryEntrySummary): string {
  if (entry.type === "piscine") {
    return "Preparer le sac de piscine";
  }

  if (entry.type === "sortie") {
    return "Preparer la sortie scolaire";
  }

  if (entry.type === "evaluation") {
    return `Revisions ${entry.subject ?? "evaluation"}`;
  }

  if (entry.type === "devoir") {
    return `Devoir ${entry.subject ?? "a faire"}`;
  }

  return entry.title;
}

export function selectChecklistTemplateForEntry(
  entry: SchoolDiaryEntrySummary,
  templates: ChecklistTemplateSummary[],
): ChecklistTemplateSummary | null {
  const targetType = mapDiaryTypeToChecklistType(entry.type);
  const byType = templates.filter((template) => template.type === targetType);
  const defaultByType = byType.find((template) => template.isDefault);
  if (defaultByType) {
    return defaultByType;
  }

  if (byType.length > 0) {
    return byType[0] ?? null;
  }

  const quotidienDefaults = templates.filter(
    (template) => template.type === "quotidien" && template.isDefault,
  );
  if (quotidienDefaults.length > 0) {
    return quotidienDefaults[0] ?? null;
  }

  return templates.find((template) => template.isDefault) ?? templates[0] ?? null;
}

export function generateChecklistDraftForDiaryEntry(
  entry: SchoolDiaryEntrySummary,
  templates: ChecklistTemplateSummary[],
): GeneratedChecklistDraft {
  const template = selectChecklistTemplateForEntry(entry, templates);
  const type = mapDiaryTypeToChecklistType(entry.type);

  const templateItems =
    template?.items
      ?.slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item, index) => ({
        label: item.label,
        sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
      })) ?? [];

  return {
    type,
    label: template?.label ?? defaultChecklistLabel(entry),
    date: entry.date,
    templateId: template?.id ?? null,
    items: templateItems,
  };
}

export type RelativeChecklistDay = "today" | "tomorrow" | "later" | "past";

export function getRelativeChecklistDay(dateKey: string, now: Date = new Date()): RelativeChecklistDay {
  const todayKey = getDateKeyFromDate(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = getDateKeyFromDate(tomorrow);

  if (dateKey === todayKey) {
    return "today";
  }

  if (dateKey === tomorrowKey) {
    return "tomorrow";
  }

  if (dateKey < todayKey) {
    return "past";
  }

  return "later";
}
