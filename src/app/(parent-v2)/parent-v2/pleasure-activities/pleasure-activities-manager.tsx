"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  RichTextEditor,
  Select,
} from "@/components/ds";
import {
  createTemplateAction,
  createTemplateTaskAction,
  deleteTemplateTaskAction,
  updateTemplateTaskAction,
} from "@/lib/actions/day-templates";
import { parseCategoryCode } from "@/lib/day-templates/constants";
import type {
  CategoryCode,
  TaskCategorySummary,
  TemplateTaskInput,
  TemplateTaskSummary,
} from "@/lib/day-templates/types";

interface PleasureWeekDayData {
  weekday: number;
  weekdayLabel: string;
  templateId: string | null;
  templateName: string | null;
  tasks: TemplateTaskSummary[];
}

interface PleasureActivitiesManagerProps {
  days: PleasureWeekDayData[];
  categories: TaskCategorySummary[];
}

type PleasureCategoryUi = "ECRANS" | "JEUX_CALMES" | "SPORT_MOUVEMENT" | "FAMILLE_RELATIONS";

interface PleasureCategoryConfig {
  id: PleasureCategoryUi;
  label: string;
  code: Extract<CategoryCode, "activity" | "routine" | "leisure">;
  subcategories: string[];
}

const CATEGORY_CONFIGS: readonly PleasureCategoryConfig[] = [
  {
    id: "ECRANS",
    label: "Ecrans",
    code: "leisure",
    subcategories: ["Film", "Serie", "Jeu video", "Documentaire"],
  },
  {
    id: "JEUX_CALMES",
    label: "Jeux calmes",
    code: "leisure",
    subcategories: ["Lego", "Puzzle", "Lecture libre", "Coloriage"],
  },
  {
    id: "SPORT_MOUVEMENT",
    label: "Sport / Mouvement",
    code: "activity",
    subcategories: ["Foot", "Natation", "Danse", "Exterieur"],
  },
  {
    id: "FAMILLE_RELATIONS",
    label: "Famille / relations",
    code: "routine",
    subcategories: ["Jeu en famille", "Discussion", "Sortie familiale", "Appel proche"],
  },
];
const DEFAULT_PLEASURE_CATEGORY = CATEGORY_CONFIGS[0] as PleasureCategoryConfig;
const CATEGORY_EMOJI_BY_UI: Record<PleasureCategoryUi, string> = {
  ECRANS: "📺",
  JEUX_CALMES: "🧩",
  SPORT_MOUVEMENT: "⚽",
  FAMILLE_RELATIONS: "👨‍👩‍👧‍👦",
};

interface PleasureFormState {
  title: string;
  categoryUi: PleasureCategoryUi;
  subCategory: string;
  date: string;
  startTime: string;
  endTime: string;
  stars: number;
  instructionsHtml: string;
}

interface EditingTaskRef {
  taskId: string;
  sourceTemplateId: string;
}

const EXTRA_CODES: readonly CategoryCode[] = ["activity", "routine", "leisure"];

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfIsoWeek(input: Date): Date {
  const date = new Date(input);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  return date;
}

function addDays(input: Date, days: number): Date {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateLong(value: Date): string {
  return value.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveUiByCode(code: Extract<CategoryCode, "activity" | "routine" | "leisure">): PleasureCategoryUi {
  return CATEGORY_CONFIGS.find((entry) => entry.code === code)?.id ?? "JEUX_CALMES";
}

function resolveConfig(ui: PleasureCategoryUi): PleasureCategoryConfig {
  return CATEGORY_CONFIGS.find((entry) => entry.id === ui) ?? DEFAULT_PLEASURE_CATEGORY;
}

function isExtraCategoryCode(
  code: CategoryCode | null,
): code is Extract<CategoryCode, "activity" | "routine" | "leisure"> {
  return code === "activity" || code === "routine" || code === "leisure";
}

function parsePleasureMetadata(task: TemplateTaskSummary): { categoryUi: PleasureCategoryUi; subCategory: string } {
  const raw = task.itemSubkind?.trim() ?? "";
  const categoryToken = raw.match(/ui:([^|]+)/)?.[1] ?? "";
  const subToken = raw.match(/sub:([^|]+)/)?.[1] ?? "";

  const parsedCode = parseCategoryCode(task.category.code ?? null);
  const fallbackUi = isExtraCategoryCode(parsedCode) ? resolveUiByCode(parsedCode) : "JEUX_CALMES";
  const categoryUi = CATEGORY_CONFIGS.some((entry) => entry.id === categoryToken as PleasureCategoryUi)
    ? (categoryToken as PleasureCategoryUi)
    : fallbackUi;

  const config = resolveConfig(categoryUi);
  const subCategory = subToken || config.subcategories[0] || "";

  return { categoryUi, subCategory };
}

function encodePleasureSubkind(categoryUi: PleasureCategoryUi, subCategory: string): string {
  return `ui:${categoryUi}|sub:${subCategory}`;
}

function resolveCategoryForUi(
  categories: TaskCategorySummary[],
  categoryUi: PleasureCategoryUi,
): TaskCategorySummary | null {
  const config = resolveConfig(categoryUi);
  for (const category of categories) {
    if (parseCategoryCode(category.code ?? null) === config.code) {
      return category;
    }
  }
  return null;
}

function isExtraTask(task: TemplateTaskSummary): boolean {
  const code = parseCategoryCode(task.category.code ?? null);
  return code ? EXTRA_CODES.includes(code) : false;
}

function isPleasureTaskForDate(task: TemplateTaskSummary, dateKey: string): boolean {
  return isExtraTask(task) && task.scheduledDate === dateKey;
}

function defaultForm(date: string): PleasureFormState {
  const base = resolveConfig("JEUX_CALMES");
  return {
    title: "",
    categoryUi: base.id,
    subCategory: base.subcategories[0] ?? "",
    date,
    startTime: "17:00",
    endTime: "17:30",
    stars: 2,
    instructionsHtml: "",
  };
}

function formatCardDate(value: Date): string {
  return value.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatStarLabel(value: number): string {
  const stars = Math.max(1, Math.min(5, value));
  return `${stars} etoile${stars > 1 ? "s" : ""}`;
}

function stripHtmlPreview(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCategoryBadgeClass(categoryUi: PleasureCategoryUi): string {
  if (categoryUi === "ECRANS") {
    return "bg-purple-100 text-purple-700";
  }
  if (categoryUi === "SPORT_MOUVEMENT") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (categoryUi === "FAMILLE_RELATIONS") {
    return "bg-pink-100 text-pink-700";
  }
  return "bg-indigo-100 text-indigo-700";
}

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="currentColor" strokeWidth="2">
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

interface PleasureCardItem {
  task: TemplateTaskSummary;
  day: PleasureWeekDayData & { date: Date };
  categoryUi: PleasureCategoryUi;
  subCategory: string;
}

export function PleasureActivitiesManager({ days, categories }: PleasureActivitiesManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [weekStartDateKey, setWeekStartDateKey] = React.useState<string>(() => {
    const monday = startOfIsoWeek(new Date());
    return toLocalDateKey(monday);
  });
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<EditingTaskRef | null>(null);
  const [feedback, setFeedback] = React.useState<{ tone: "error" | "success"; message: string } | null>(null);
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = React.useState<PleasureFormState>(() => defaultForm(toLocalDateKey(new Date())));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState<"ALL" | PleasureCategoryUi>("ALL");

  const weekStart = React.useMemo(() => parseDateKey(weekStartDateKey), [weekStartDateKey]);
  const weekDays = React.useMemo(
    () => days.map((entry, index) => ({ ...entry, date: addDays(weekStart, index) })),
    [days, weekStart],
  );
  const weekEnd = React.useMemo(() => addDays(weekStart, 6), [weekStart]);

  const activityCards = React.useMemo(() => {
    const list: PleasureCardItem[] = [];

    for (const day of weekDays) {
      const dayDateKey = toLocalDateKey(day.date);
      for (const task of day.tasks) {
        if (!isPleasureTaskForDate(task, dayDateKey)) {
          continue;
        }
        const metadata = parsePleasureMetadata(task);
        list.push({
          task,
          day,
          categoryUi: metadata.categoryUi,
          subCategory: metadata.subCategory,
        });
      }
    }

    return list;
  }, [weekDays]);

  const filteredCards = React.useMemo(() => {
    return activityCards.filter((item) => {
      if (filterCategory !== "ALL" && item.categoryUi !== filterCategory) {
        return false;
      }

      const haystack = `${item.task.title} ${item.subCategory}`.toLowerCase();
      return haystack.includes(searchTerm.trim().toLowerCase());
    });
  }, [activityCards, filterCategory, searchTerm]);

  function openCreateModal(targetDate: Date): void {
    setEditingTask(null);
    setFormState(defaultForm(toLocalDateKey(targetDate)));
    setFeedback(null);
    setIsModalOpen(true);
  }

  function openEditModal(task: TemplateTaskSummary, sourceTemplateId: string, date: Date): void {
    const metadata = parsePleasureMetadata(task);
    setEditingTask({
      taskId: task.id,
      sourceTemplateId,
    });
    setFormState({
      title: task.title,
      categoryUi: metadata.categoryUi,
      subCategory: metadata.subCategory,
      date: task.scheduledDate ?? toLocalDateKey(date),
      startTime: task.startTime,
      endTime: task.endTime,
      stars: Math.max(1, Math.min(5, task.pointsBase)),
      instructionsHtml: task.instructionsHtml ?? task.description ?? "",
    });
    setFeedback(null);
    setIsModalOpen(true);
  }

  function resolveTemplateIdByDate(dateKey: string): string | null {
    const weekday = parseDateKey(dateKey).getDay();
    return days.find((entry) => entry.weekday === weekday)?.templateId ?? null;
  }

  async function ensureTemplateIdByDate(dateKey: string): Promise<string | null> {
    const existingTemplateId = resolveTemplateIdByDate(dateKey);
    if (existingTemplateId) {
      return existingTemplateId;
    }

    const weekday = parseDateKey(dateKey).getDay();
    const weekdayEntry = days.find((entry) => entry.weekday === weekday) ?? null;
    const weekdayLabel = weekdayEntry?.weekdayLabel ?? "Jour";
    const created = await createTemplateAction({
      name: `Journee type ${weekdayLabel}`,
      weekday,
      isDefault: true,
    });

    if (!created.success || !created.data?.id) {
      return null;
    }

    return created.data.id;
  }

  function closeModal(): void {
    setEditingTask(null);
    setIsModalOpen(false);
  }

  function saveActivity(): void {
    if (!formState.title.trim()) {
      setFeedback({ tone: "error", message: "Le titre est requis." });
      return;
    }

    if (formState.startTime >= formState.endTime) {
      setFeedback({ tone: "error", message: "L'heure de fin doit etre apres l'heure de debut." });
      return;
    }

    const category = resolveCategoryForUi(categories, formState.categoryUi);
    if (!category) {
      setFeedback({ tone: "error", message: "Categorie d'activite introuvable." });
      return;
    }

    const categoryCode = parseCategoryCode(category.code ?? null);
    const payload: TemplateTaskInput = {
      categoryId: category.id,
      title: formState.title.trim(),
      itemKind: categoryCode === "leisure" ? "leisure" : "activity",
      itemSubkind: encodePleasureSubkind(formState.categoryUi, formState.subCategory),
      description: null,
      instructionsHtml: formState.instructionsHtml.trim() || null,
      startTime: formState.startTime,
      endTime: formState.endTime,
      pointsBase: Math.max(1, Math.min(5, Math.trunc(formState.stars))),
      knowledgeCardId: null,
      scheduledDate: formState.date,
    };

    startTransition(async () => {
      const targetTemplateId = await ensureTemplateIdByDate(formState.date);
      if (!targetTemplateId) {
        setFeedback({
          tone: "error",
          message: "Impossible de preparer la journee type pour cette date.",
        });
        return;
      }

      if (!editingTask) {
        const created = await createTemplateTaskAction(targetTemplateId, payload);
        if (!created.success) {
          setFeedback({ tone: "error", message: created.error ?? "Creation impossible." });
          return;
        }

        setFeedback({ tone: "success", message: "Activite creee." });
        closeModal();
        router.refresh();
        return;
      }

      if (editingTask.sourceTemplateId === targetTemplateId) {
        const updated = await updateTemplateTaskAction(editingTask.taskId, payload);
        if (!updated.success) {
          setFeedback({ tone: "error", message: updated.error ?? "Mise a jour impossible." });
          return;
        }

        setFeedback({ tone: "success", message: "Activite mise a jour." });
        closeModal();
        router.refresh();
        return;
      }

      const recreated = await createTemplateTaskAction(targetTemplateId, payload);
      if (!recreated.success) {
        setFeedback({ tone: "error", message: recreated.error ?? "Deplacement impossible." });
        return;
      }

      const deleted = await deleteTemplateTaskAction(editingTask.taskId);
      if (!deleted.success) {
        setFeedback({
          tone: "error",
          message: "Activite dupliquee mais ancienne activite non supprimee. Supprimez-la manuellement.",
        });
        router.refresh();
        return;
      }

      setFeedback({ tone: "success", message: "Activite deplacee et mise a jour." });
      closeModal();
      router.refresh();
    });
  }

  function removeActivity(taskId: string): void {
    if (!window.confirm("Supprimer cette activite ?")) {
      return;
    }

    startTransition(async () => {
      const deleted = await deleteTemplateTaskAction(taskId);
      if (!deleted.success) {
        setFeedback({ tone: "error", message: deleted.error ?? "Suppression impossible." });
        return;
      }

      setFeedback({ tone: "success", message: "Activite supprimee." });
      router.refresh();
    });
  }

  const selectedConfig = resolveConfig(formState.categoryUi);
  const dateRangeLabel = `Du ${formatDateLong(weekStart)} au ${formatDateLong(weekEnd)}`;
  const modalLabelClass =
    "flex select-none items-center gap-2 text-sm font-medium leading-none text-[#030213]";
  const modalFieldClass =
    "h-9 w-full rounded-md border border-black/10 bg-[#f3f3f5] px-3 py-1 text-base text-[#030213] shadow-none outline-none transition-[color,box-shadow] placeholder:text-[#717182] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10 md:text-sm";
  const modalDateTriggerClass =
    "inline-flex h-9 w-full items-center justify-start gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#030213] transition-colors outline-none hover:bg-[#e9ebef] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10";
  const modalFooterButtonClass = "h-9 rounded-md px-4 text-sm font-medium transition-all";
  const activityDateLabel = React.useMemo(() => {
    const date = parseDateKey(formState.date);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [formState.date]);

  function openNativeDatePicker(): void {
    const input = dateInputRef.current;
    if (!input) {
      return;
    }

    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher une activite..."
              className="h-9 w-full rounded-md border border-black/10 bg-[#f3f3f5] pl-9 pr-3 text-sm text-[#030213] outline-none transition-[color,box-shadow] placeholder:text-[#717182] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10"
            />
          </div>

          <div className="w-[200px]">
            <Select
              value={filterCategory}
              className="h-9 w-[200px] rounded-md border border-black/10 bg-[#f3f3f5] text-sm text-[#030213] shadow-none focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10"
              onChange={(event) => setFilterCategory(event.target.value as "ALL" | PleasureCategoryUi)}
            >
              <option value="ALL">Toutes categories</option>
              {CATEGORY_CONFIGS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="h-9 border-[#030213] bg-[#030213] bg-none px-4 py-2 text-sm font-medium text-white shadow-none hover:bg-[#030213]/90 hover:text-white"
            onClick={() => openCreateModal(new Date())}
            disabled={isPending}
          >
            <PlusIcon className="h-4 w-4" />
            Nouvelle activite
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-600">{dateRangeLabel}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 rounded-md border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-none hover:bg-gray-50"
            onClick={() => setWeekStartDateKey(toLocalDateKey(addDays(weekStart, -7)))}
            disabled={isPending}
          >
            Semaine precedente
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 rounded-md border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-none hover:bg-gray-50"
            onClick={() => setWeekStartDateKey(toLocalDateKey(addDays(weekStart, 7)))}
            disabled={isPending}
          >
            Semaine suivante
          </Button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {filteredCards.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
          Aucune activite ne correspond aux filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((entry) => {
            const categoryLabel = resolveConfig(entry.categoryUi).label;
            const previewText = stripHtmlPreview(entry.task.instructionsHtml ?? entry.task.description ?? null);

            return (
              <article
                key={entry.task.id}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{entry.task.title}</h3>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${getCategoryBadgeClass(entry.categoryUi)}`}
                      >
                        {categoryLabel}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {entry.subCategory}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {entry.day.templateId ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => openEditModal(entry.task, entry.day.templateId as string, entry.day.date)}
                          disabled={isPending}
                          aria-label="Modifier l'activite"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md text-red-600 transition-all hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => removeActivity(entry.task.id)}
                          disabled={isPending}
                          aria-label="Supprimer l'activite"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {formatCardDate(entry.day.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {entry.task.startTime} - {entry.task.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <StarIcon className="h-3 w-3 fill-orange-500 text-orange-500" />
                    {formatStarLabel(entry.task.pointsBase)}
                  </span>
                </div>

                {previewText ? (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{previewText}</p>
                ) : (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">Aucune consigne.</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingTask ? "Modifier l'activite plaisir" : "Nouvelle activite plaisir"}
        className="pleasure-activities-modal max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-lg"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="pleasure-title" className={modalLabelClass}>
              Titre de l&apos;activite *
            </label>
            <Input
              id="pleasure-title"
              className={modalFieldClass}
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ex: 30 minutes de jeux video"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="pleasure-category" className={modalLabelClass}>
                Categorie
              </label>
              <Select
                id="pleasure-category"
                className={modalFieldClass}
                value={formState.categoryUi}
                onChange={(event) => {
                  const nextCategoryUi = event.target.value as PleasureCategoryUi;
                  const nextConfig = resolveConfig(nextCategoryUi);
                  setFormState((current) => ({
                    ...current,
                    categoryUi: nextCategoryUi,
                    subCategory: nextConfig.subcategories[0] ?? "",
                  }));
                }}
              >
                {CATEGORY_CONFIGS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {CATEGORY_EMOJI_BY_UI[entry.id]} {entry.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="pleasure-subcategory" className={modalLabelClass}>
                Sous-categorie
              </label>
              <Select
                id="pleasure-subcategory"
                className={modalFieldClass}
                value={formState.subCategory}
                onChange={(event) => setFormState((current) => ({ ...current, subCategory: event.target.value }))}
              >
                {selectedConfig.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pleasure-date" className={modalLabelClass}>
              Date
            </label>
            <div className="relative">
              <button
                type="button"
                className={modalDateTriggerClass}
                onClick={openNativeDatePicker}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {activityDateLabel}
              </button>
              <input
                ref={dateInputRef}
                id="pleasure-date"
                type="date"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                value={formState.date}
                onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="pleasure-start" className={modalLabelClass}>
                Heure de debut
              </label>
              <Input
                id="pleasure-start"
                type="time"
                className={modalFieldClass}
                value={formState.startTime}
                onChange={(event) => setFormState((current) => ({ ...current, startTime: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pleasure-end" className={modalLabelClass}>
                Heure de fin
              </label>
              <Input
                id="pleasure-end"
                type="time"
                className={modalFieldClass}
                value={formState.endTime}
                onChange={(event) => setFormState((current) => ({ ...current, endTime: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pleasure-stars" className={modalLabelClass}>
              Nombre d&apos;etoiles
            </label>
            <Input
              id="pleasure-stars"
              type="number"
              className={modalFieldClass}
              min={1}
              max={5}
              value={formState.stars}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  stars: Number(event.target.value || 1),
                }))
              }
            />
          </div>

          <div className="pleasure-activities-instructions space-y-2">
            <label className={modalLabelClass}>Instructions</label>
            <RichTextEditor
              valueHtml={formState.instructionsHtml}
              onChangeHtml={(html) => setFormState((current) => ({ ...current, instructionsHtml: html }))}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              className={`${modalFooterButtonClass} pleasure-activities-modal-cancel`}
              onClick={closeModal}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              className={`${modalFooterButtonClass} pleasure-activities-modal-submit`}
              onClick={saveActivity}
              loading={isPending}
            >
              {editingTask ? "Enregistrer" : "Creer l'activite"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
