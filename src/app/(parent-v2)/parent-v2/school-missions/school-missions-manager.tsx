"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  Modal,
  RichTextEditor,
  Select,
  Input,
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
  TemplateTaskSummary,
  TemplateTaskInput,
} from "@/lib/day-templates/types";

type SchoolSubject = "Francais" | "Mathematiques" | "Allemand";
type RevisionSheetType =
  | "Conjugaison"
  | "Fonction dans la phrase"
  | "Concept numerique"
  | "Propriete / regle"
  | "Vocabulaire";

interface SchoolWeekDayData {
  weekday: number;
  weekdayLabel: string;
  templateId: string | null;
  templateName: string | null;
  tasks: TemplateTaskSummary[];
}

interface SchoolMissionsManagerProps {
  days: SchoolWeekDayData[];
  categories: TaskCategorySummary[];
}

const SCHOOL_CATEGORY_CODES: readonly CategoryCode[] = ["homework", "revision", "training"];
const SCHOOL_SUBJECT_OPTIONS: ReadonlyArray<{
  value: SchoolSubject;
  label: string;
  emoji: string;
}> = [
  { value: "Francais", label: "Francais", emoji: "📝" },
  { value: "Mathematiques", label: "Mathematiques", emoji: "➗" },
  { value: "Allemand", label: "Allemand", emoji: "🇩🇪" },
];
const REVISION_SHEET_BY_SUBJECT: Record<SchoolSubject, RevisionSheetType[]> = {
  Francais: ["Conjugaison", "Fonction dans la phrase"],
  Mathematiques: ["Concept numerique", "Propriete / regle"],
  Allemand: ["Conjugaison", "Vocabulaire"],
};
const CATEGORY_LABEL_BY_CODE: Record<CategoryCode, string> = {
  homework: "Devoirs",
  revision: "Revisions",
  training: "Entrainement",
  activity: "Activites",
  routine: "Routine",
  leisure: "Loisirs",
};
const SUBJECT_SHORT_CODE_BY_SUBJECT: Record<SchoolSubject, string> = {
  Francais: "FR",
  Mathematiques: "MA",
  Allemand: "ALL",
};
const SUBJECT_LABEL_BY_SUBJECT: Record<SchoolSubject, string> = {
  Francais: "Francais",
  Mathematiques: "Mathematiques",
  Allemand: "Allemand",
};

interface SchoolMissionFormState {
  title: string;
  subject: SchoolSubject;
  categoryCode: Extract<CategoryCode, "homework" | "revision" | "training">;
  date: string;
  startTime: string;
  endTime: string;
  stars: number;
  revisionSheetType: RevisionSheetType | "";
  instructionsHtml: string;
}

interface EditingTaskRef {
  taskId: string;
  sourceTemplateId: string;
}

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

function formatDateShort(value: Date): string {
  return value.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getIsoWeekNumber(input: Date): number {
  const date = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function resolveCategoryByCode(
  categories: TaskCategorySummary[],
  code: Extract<CategoryCode, "homework" | "revision" | "training">,
): TaskCategorySummary | null {
  for (const category of categories) {
    if (parseCategoryCode(category.code ?? null) === code) {
      return category;
    }
  }
  return null;
}

function isSchoolTask(task: TemplateTaskSummary): boolean {
  const code = parseCategoryCode(task.category.code ?? null);
  return code ? SCHOOL_CATEGORY_CODES.includes(code) : false;
}

function isSchoolCategoryCode(
  code: CategoryCode | null,
): code is Extract<CategoryCode, "homework" | "revision" | "training"> {
  return code === "homework" || code === "revision" || code === "training";
}

function extractSchoolMetadata(task: TemplateTaskSummary): {
  subject: SchoolSubject;
  revisionSheetType: RevisionSheetType | "";
} {
  const raw = task.itemSubkind?.trim() ?? "";
  const subjectToken = raw.match(/subject:([^|]+)/)?.[1] ?? "";
  const sheetToken = raw.match(/sheet:([^|]+)/)?.[1] ?? "";

  const parsedSubject =
    SCHOOL_SUBJECT_OPTIONS.find((option) => option.value === subjectToken)?.value ?? "Francais";
  const parsedSheet = (sheetToken || "") as RevisionSheetType | "";

  return {
    subject: parsedSubject,
    revisionSheetType: parsedSheet,
  };
}

function encodeSchoolSubkind(
  subject: SchoolSubject,
  revisionSheetType: RevisionSheetType | "",
): string {
  const parts = [`subject:${subject}`];
  if (revisionSheetType) {
    parts.push(`sheet:${revisionSheetType}`);
  }
  return parts.join("|");
}

function getSubjectEmoji(task: TemplateTaskSummary): string {
  const { subject } = extractSchoolMetadata(task);
  return SCHOOL_SUBJECT_OPTIONS.find((option) => option.value === subject)?.emoji ?? "📘";
}

function getSubjectShortCode(task: TemplateTaskSummary): string {
  const { subject } = extractSchoolMetadata(task);
  return SUBJECT_SHORT_CODE_BY_SUBJECT[subject] ?? "FR";
}

function sortTasksBySchedule(tasks: TemplateTaskSummary[]): TemplateTaskSummary[] {
  return [...tasks].sort((left, right) => {
    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }
    if (left.endTime !== right.endTime) {
      return left.endTime.localeCompare(right.endTime);
    }
    return left.title.localeCompare(right.title);
  });
}

function matchesTaskDate(task: TemplateTaskSummary, dateKey: string): boolean {
  return task.scheduledDate === dateKey;
}

function CalendarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 2v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M16 2v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 10h18" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function defaultForm(date: string): SchoolMissionFormState {
  return {
    title: "",
    subject: "Francais",
    categoryCode: "homework",
    date,
    startTime: "16:00",
    endTime: "16:30",
    stars: 2,
    revisionSheetType: "",
    instructionsHtml: "",
  };
}

export function SchoolMissionsManager({
  days,
  categories,
}: SchoolMissionsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const todayKey = React.useMemo(() => toLocalDateKey(new Date()), []);
  const [weekStartDateKey, setWeekStartDateKey] = React.useState<string>(() => {
    const monday = startOfIsoWeek(new Date());
    return toLocalDateKey(monday);
  });
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<EditingTaskRef | null>(null);
  const [feedback, setFeedback] = React.useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = React.useState<SchoolMissionFormState>(() =>
    defaultForm(toLocalDateKey(new Date())),
  );
  const [selectedDateKey, setSelectedDateKey] = React.useState<string>(todayKey);

  const weekStart = React.useMemo(() => parseDateKey(weekStartDateKey), [weekStartDateKey]);
  const weekDays = React.useMemo(
    () => days.map((entry, index) => ({ ...entry, date: addDays(weekStart, index) })),
    [days, weekStart],
  );
  const weekEnd = React.useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekNumber = React.useMemo(() => getIsoWeekNumber(weekStart), [weekStart]);
  const selectedDay = React.useMemo(() => {
    const explicit = weekDays.find((day) => toLocalDateKey(day.date) === selectedDateKey);
    if (explicit) {
      return explicit;
    }
    const today = weekDays.find((day) => toLocalDateKey(day.date) === todayKey);
    return today ?? weekDays[0] ?? null;
  }, [selectedDateKey, todayKey, weekDays]);
  const selectedDayDateKey = selectedDay ? toLocalDateKey(selectedDay.date) : "";
  const selectedDayIndex = React.useMemo(
    () => weekDays.findIndex((day) => toLocalDateKey(day.date) === selectedDayDateKey),
    [selectedDayDateKey, weekDays],
  );
  const selectedDayTasks = React.useMemo(
    () =>
      selectedDay
        ? sortTasksBySchedule(
            selectedDay.tasks.filter(
              (task) => isSchoolTask(task) && matchesTaskDate(task, selectedDayDateKey),
            ),
          )
        : [],
    [selectedDay, selectedDayDateKey],
  );

  React.useEffect(() => {
    if (weekDays.length === 0) {
      return;
    }

    const weekKeys = weekDays.map((day) => toLocalDateKey(day.date));
    if (weekKeys.includes(selectedDateKey)) {
      return;
    }

    const fallbackDateKey = weekKeys.includes(todayKey) ? todayKey : (weekKeys[0] ?? todayKey);
    setSelectedDateKey(fallbackDateKey);
  }, [selectedDateKey, todayKey, weekDays]);

  function openCreateModal(targetDate: Date): void {
    setEditingTask(null);
    setFormState(defaultForm(toLocalDateKey(targetDate)));
    setFeedback(null);
    setIsModalOpen(true);
  }

  function openEditModal(task: TemplateTaskSummary, sourceTemplateId: string, date: Date): void {
    const metadata = extractSchoolMetadata(task);
    const code = parseCategoryCode(task.category.code ?? null);
    if (!isSchoolCategoryCode(code)) {
      return;
    }

    setEditingTask({
      taskId: task.id,
      sourceTemplateId,
    });
    setFormState({
      title: task.title,
      subject: metadata.subject,
      categoryCode: code,
      date: task.scheduledDate ?? toLocalDateKey(date),
      startTime: task.startTime,
      endTime: task.endTime,
      stars: Math.max(1, Math.min(5, task.pointsBase)),
      revisionSheetType: metadata.revisionSheetType,
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
    setIsModalOpen(false);
    setEditingTask(null);
  }

  function saveMission(): void {
    if (!formState.title.trim()) {
      setFeedback({ tone: "error", message: "Le titre est requis." });
      return;
    }

    if (formState.startTime >= formState.endTime) {
      setFeedback({ tone: "error", message: "L'heure de fin doit etre apres l'heure de debut." });
      return;
    }

    const category = resolveCategoryByCode(categories, formState.categoryCode);
    if (!category) {
      setFeedback({ tone: "error", message: "Categorie scolaire introuvable." });
      return;
    }

    const payload: TemplateTaskInput = {
      categoryId: category.id,
      title: formState.title.trim(),
      itemKind: "mission",
      itemSubkind: encodeSchoolSubkind(formState.subject, formState.revisionSheetType),
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
          setFeedback({
            tone: "error",
            message: created.error ?? "Impossible de creer la mission.",
          });
          return;
        }

        setFeedback({ tone: "success", message: "Mission creee." });
        setIsModalOpen(false);
        setEditingTask(null);
        router.refresh();
        return;
      }

      if (editingTask.sourceTemplateId === targetTemplateId) {
        const updated = await updateTemplateTaskAction(editingTask.taskId, payload);
        if (!updated.success) {
          setFeedback({
            tone: "error",
            message: updated.error ?? "Impossible de modifier la mission.",
          });
          return;
        }

        setFeedback({ tone: "success", message: "Mission mise a jour." });
        setIsModalOpen(false);
        setEditingTask(null);
        router.refresh();
        return;
      }

      const recreated = await createTemplateTaskAction(targetTemplateId, payload);
      if (!recreated.success) {
        setFeedback({
          tone: "error",
          message: recreated.error ?? "Impossible de deplacer la mission.",
        });
        return;
      }

      const deleted = await deleteTemplateTaskAction(editingTask.taskId);
      if (!deleted.success) {
        setFeedback({
          tone: "error",
          message:
            "Mission dupliquee mais ancienne mission non supprimee. Supprimez-la manuellement.",
        });
        router.refresh();
        return;
      }

      setFeedback({ tone: "success", message: "Mission deplacee et mise a jour." });
      setIsModalOpen(false);
      setEditingTask(null);
      router.refresh();
    });
  }

  function removeMission(taskId: string): void {
    if (!window.confirm("Supprimer cette mission ?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplateTaskAction(taskId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Suppression impossible." });
        return;
      }

      setFeedback({ tone: "success", message: "Mission supprimee." });
      router.refresh();
    });
  }

  const revisionsSheetOptions = REVISION_SHEET_BY_SUBJECT[formState.subject];
  const dateRangeLabel = `Du ${formatDateLong(weekStart)} au ${formatDateLong(weekEnd)}`;
  const modalLabelClass =
    "flex select-none items-center gap-2 text-sm font-medium leading-none text-[#030213]";
  const modalFieldClass =
    "h-9 w-full rounded-md border border-black/10 bg-[#f3f3f5] px-3 py-1 text-base text-[#030213] shadow-none outline-none transition-[color,box-shadow] placeholder:text-[#717182] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10 md:text-sm";
  const modalDateTriggerClass =
    "inline-flex h-9 w-full items-center justify-start gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#030213] transition-colors outline-none hover:bg-[#e9ebef] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10";
  const modalFooterButtonClass = "h-9 rounded-md px-4 text-sm font-medium transition-all";
  const missionDateLabel = React.useMemo(() => {
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

  function formatMissionCount(count: number): string {
    if (count <= 0) {
      return "Aucune mission";
    }
    if (count === 1) {
      return "1 mission";
    }
    return `${count} missions`;
  }

  function shiftSelectedDay(offset: number): void {
    if (selectedDayIndex < 0) {
      return;
    }
    const nextIndex = selectedDayIndex + offset;
    if (nextIndex < 0 || nextIndex >= weekDays.length) {
      return;
    }
    const nextDay = weekDays[nextIndex];
    if (!nextDay) {
      return;
    }
    setSelectedDateKey(toLocalDateKey(nextDay.date));
  }

  const selectedDayDetailLabel = selectedDay
    ? selectedDay.date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="space-y-4">
      <Card className="school-missions-panel">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <p className="text-sm font-semibold text-text-secondary">Agenda hebdomadaire</p>
            <p className="text-sm text-text-secondary">
              {dateRangeLabel} - S{weekNumber}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="school-missions-button-secondary"
              onClick={() => setWeekStartDateKey(toLocalDateKey(addDays(weekStart, -7)))}
              disabled={isPending}
            >
              Semaine precedente
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="school-missions-button-secondary"
              onClick={() => setWeekStartDateKey(toLocalDateKey(addDays(weekStart, 7)))}
              disabled={isPending}
            >
              Semaine suivante
            </Button>
            <Button
              type="button"
              variant="premium"
              className="school-missions-button-primary"
              onClick={() => openCreateModal(selectedDay ? selectedDay.date : new Date())}
              disabled={isPending}
            >
              + Nouvelle mission
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <Card className="school-missions-panel">
          <CardContent className="py-3">
            <p
              className={`text-sm font-semibold ${feedback.tone === "error" ? "text-status-error" : "text-status-success"}`}
            >
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[980px] grid-cols-7 gap-3 lg:min-w-0">
          {weekDays.map((day) => {
            const dayDateKey = toLocalDateKey(day.date);
            const dayTasks = sortTasksBySchedule(
              day.tasks.filter((task) => isSchoolTask(task) && matchesTaskDate(task, dayDateKey)),
            );
            const isToday = dayDateKey === todayKey;
            const isSelected = dayDateKey === selectedDayDateKey;
            const dayCountLabel = formatMissionCount(dayTasks.length);
            const daySubjects = Array.from(
              new Set(dayTasks.map((task) => getSubjectShortCode(task))),
            ).slice(0, 3);

            return (
              <article
                key={day.weekday}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDateKey(dayDateKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDateKey(dayDateKey);
                  }
                }}
                className={`school-missions-day-card rounded-xl p-3 ${isToday ? "school-missions-day-card--today" : ""} ${isSelected ? "school-missions-day-card--selected" : ""}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {day.weekdayLabel} {formatDateShort(day.date)}
                    </p>
                    <p className="text-xs text-text-secondary">{dayCountLabel}</p>
                  </div>
                  {isToday ? (
                    <Badge variant="info" className="school-missions-chip">
                      Aujourd&apos;hui
                    </Badge>
                  ) : null}
                </div>

                {daySubjects.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {daySubjects.map((subject) => (
                      <span
                        key={`${dayDateKey}-${subject}`}
                        className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-text-secondary">Aucune mission.</p>
                  ) : (
                    <>
                      {dayTasks.slice(0, 3).map((task) => {
                        const code = parseCategoryCode(task.category.code ?? null);
                        const categoryLabel = code ? CATEGORY_LABEL_BY_CODE[code] : task.category.name;
                        return (
                          <div key={task.id} className="rounded-lg border border-black/10 bg-white/80 p-2">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                                {getSubjectShortCode(task)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-text-primary">
                                  {task.title}
                                </p>
                                <p className="truncate text-[11px] text-text-secondary">
                                  {categoryLabel}
                                </p>
                              </div>
                              <span className="text-[11px] text-text-secondary">
                                {task.startTime && task.endTime
                                  ? `${task.startTime}-${task.endTime}`
                                  : "Horaire libre"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 ? (
                        <p className="text-xs text-text-secondary">
                          + {dayTasks.length - 3} mission(s) supplementaire(s)
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="school-missions-button-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDateKey(dayDateKey);
                      openCreateModal(day.date);
                    }}
                    disabled={isPending}
                  >
                    Nouvelle mission
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Card className="school-missions-panel">
        <CardContent className="space-y-4 py-5">
          {selectedDay ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-text-primary">
                    Detail pour {selectedDayDetailLabel}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatMissionCount(selectedDayTasks.length)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="school-missions-button-secondary"
                    onClick={() => shiftSelectedDay(-1)}
                    disabled={isPending || selectedDayIndex <= 0}
                  >
                    Jour precedent
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="school-missions-button-secondary"
                    onClick={() => shiftSelectedDay(1)}
                    disabled={isPending || selectedDayIndex < 0 || selectedDayIndex >= weekDays.length - 1}
                  >
                    Jour suivant
                  </Button>
                </div>
              </div>

              {selectedDayTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 bg-white/70 p-4">
                  <p className="text-sm text-text-secondary">
                    Aucune mission pour cette journee.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayTasks.map((task) => {
                    const code = parseCategoryCode(task.category.code ?? null);
                    const categoryLabel = code ? CATEGORY_LABEL_BY_CODE[code] : task.category.name;
                    const { subject } = extractSchoolMetadata(task);

                    return (
                      <article key={task.id} className="school-missions-task-card rounded-xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary">
                              {getSubjectEmoji(task)} {task.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
                              <span className="rounded-md bg-black/5 px-2 py-1 font-semibold text-text-primary">
                                {SUBJECT_LABEL_BY_SUBJECT[subject]}
                              </span>
                              <span className="rounded-md bg-black/5 px-2 py-1">{categoryLabel}</span>
                              <span className="rounded-md bg-black/5 px-2 py-1">
                                {task.startTime && task.endTime
                                  ? `${task.startTime} - ${task.endTime}`
                                  : "Horaire libre"}
                              </span>
                              <span className="rounded-md bg-black/5 px-2 py-1">
                                {"⭐".repeat(Math.max(1, Math.min(5, task.pointsBase)))}
                              </span>
                            </div>
                          </div>
                          {selectedDay.templateId ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="school-missions-button-secondary"
                                disabled={isPending}
                                onClick={() =>
                                  openEditModal(task, selectedDay.templateId as string, selectedDay.date)
                                }
                              >
                                Modifier
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="school-missions-button-secondary"
                                disabled={isPending}
                                onClick={() => removeMission(task.id)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="button"
                  variant="premium"
                  className="school-missions-button-primary"
                  onClick={() => openCreateModal(selectedDay.date)}
                  disabled={isPending}
                >
                  + Nouvelle mission pour ce jour
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingTask ? "Modifier la mission d'ecole" : "Nouvelle mission d'ecole"}
        className="school-missions-modal max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <div className="school-missions-modal-body space-y-6">
          <div className="space-y-2">
            <label htmlFor="mission-title" className={modalLabelClass}>
              Titre de la mission *
            </label>
            <Input
              id="mission-title"
              className={modalFieldClass}
              value={formState.title}
              onChange={(event) =>
                setFormState((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ex: Exercices de maths page 42"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="mission-subject" className={modalLabelClass}>
              Matiere
            </label>
            <Select
              id="mission-subject"
              className={modalFieldClass}
              value={formState.subject}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  subject: event.target.value as SchoolSubject,
                  revisionSheetType: "",
                }))
              }
            >
              {SCHOOL_SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="mission-date" className={modalLabelClass}>
              Date
            </label>
            <div className="relative">
              <button
                type="button"
                className={modalDateTriggerClass}
                onClick={openNativeDatePicker}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {missionDateLabel}
              </button>
              <input
                ref={dateInputRef}
                id="mission-date"
                type="date"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                value={formState.date}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, date: event.target.value }))
                }
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="mission-start" className={modalLabelClass}>
                Heure de debut
              </label>
              <Input
                id="mission-start"
                type="time"
                className={modalFieldClass}
                value={formState.startTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, startTime: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="mission-end" className={modalLabelClass}>
                Heure de fin
              </label>
              <Input
                id="mission-end"
                type="time"
                className={modalFieldClass}
                value={formState.endTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, endTime: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="mission-stars" className={modalLabelClass}>
              Nombre d&apos;etoiles
            </label>
            <Input
              id="mission-stars"
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

          <div className="space-y-2">
            <label htmlFor="mission-category" className={modalLabelClass}>
              Type de mission
            </label>
            <Select
              id="mission-category"
              className={modalFieldClass}
              value={formState.categoryCode}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  categoryCode: event.target.value as SchoolMissionFormState["categoryCode"],
                  revisionSheetType:
                    event.target.value === "revision" ? current.revisionSheetType : "",
                }))
              }
            >
              <option value="homework">Devoirs</option>
              <option value="revision">Revisions</option>
              <option value="training">Entrainement</option>
            </Select>
          </div>

          {formState.categoryCode === "revision" ? (
            <div className="space-y-2">
              <label htmlFor="mission-sheet-type" className={modalLabelClass}>
                Fiche de revision (optionnel)
              </label>
              <Select
                id="mission-sheet-type"
                className={modalFieldClass}
                value={formState.revisionSheetType}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    revisionSheetType: event.target.value as RevisionSheetType | "",
                  }))
                }
              >
                <option value="">Aucune fiche</option>
                {revisionsSheetOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div className="school-missions-instructions space-y-2">
            <label className={modalLabelClass}>Instructions</label>
            <RichTextEditor
              valueHtml={formState.instructionsHtml}
              onChangeHtml={(html) =>
                setFormState((current) => ({ ...current, instructionsHtml: html }))
              }
            />
            <CardDescription className="text-xs text-[#717182]">
              Rich text editor sera implemente avec Tiptap
            </CardDescription>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              className={`${modalFooterButtonClass} school-missions-modal-cancel`}
              onClick={closeModal}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              className={`${modalFooterButtonClass} school-missions-modal-submit`}
              onClick={saveMission}
              loading={isPending}
            >
              {editingTask ? "Enregistrer" : "Creer la mission"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

