import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import {
  getSchoolPeriodsForCurrentFamily,
  getTemplatesWithTasksForWeekday,
} from "@/lib/api/templates";
import { buildDayContext } from "@/lib/day-templates/school-calendar";
import { sortTemplateTasks } from "@/lib/day-templates/timeline";
import { normalizeTimeLabel } from "@/lib/day-templates/time";
import { getDateKeyInTimeZone } from "@/lib/time/daylight";
import { getFamilyLocationForCurrentFamily } from "@/lib/time/family-location.server";
import {
  ensureDemoChecklistInstanceForTemplateDate,
  listDemoChecklistInstancesForChildFromDate,
  listDemoChecklistInstancesByDates,
  listDemoChecklistTemplates,
} from "@/lib/demo/school-diary-store";
import type {
  ChecklistByDay,
  ChecklistInstanceSummary,
  ChecklistTemplateSummary,
  DayPeriod,
  PlanActionableKind,
  SchoolPeriodSummary,
  TemplateTaskSummary,
  TemplateWithTasks,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ChecklistTemplateRow = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistItemRow = Database["public"]["Tables"]["checklist_items"]["Row"];
type ChecklistInstanceRow = Database["public"]["Tables"]["checklist_instances"]["Row"];
type ChecklistInstanceItemRow = Database["public"]["Tables"]["checklist_instance_items"]["Row"];
type TaskInstanceRow = Database["public"]["Tables"]["task_instances"]["Row"];
type TemplateTaskRow = Database["public"]["Tables"]["template_tasks"]["Row"];
type TaskCategoryRow = Database["public"]["Tables"]["task_categories"]["Row"];

const TIME_LABEL_PATTERN = /^\d{2}:\d{2}$/;

function mapChecklistTemplate(
  row: ChecklistTemplateRow,
  items: ChecklistItemRow[],
): ChecklistTemplateSummary {
  const recurrenceDays = Array.isArray(row.recurrence_days)
    ? row.recurrence_days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    : [];

  return {
    id: row.id,
    familyId: row.family_id,
    type: row.type,
    label: row.label,
    description: row.description,
    isDefault: row.is_default,
    recurrenceRule: row.recurrence_rule ?? "none",
    recurrenceDays,
    recurrenceStartDate: row.recurrence_start_date ?? null,
    recurrenceEndDate: row.recurrence_end_date ?? null,
    items: items
      .map((item) => ({
        id: item.id,
        templateId: item.template_id,
        label: item.label,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

function mapChecklistInstance(
  row: ChecklistInstanceRow,
  items: ChecklistInstanceItemRow[],
): ChecklistInstanceSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    diaryEntryId: row.diary_entry_id,
    sourceTemplateId: row.source_template_id ?? null,
    type: row.type,
    label: row.label,
    date: row.date,
    createdAt: row.created_at,
    items: items
      .map((item) => ({
        id: item.id,
        checklistInstanceId: item.checklist_instance_id,
        label: item.label,
        isChecked: item.is_checked,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

export interface ChecklistPageData {
  child: ChildProfileRef | null;
  byDay: ChecklistByDay;
  tomorrow: TomorrowPreparationSummary;
}

export interface TomorrowKeyMomentSummary {
  id: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  label: string;
  kind: PlanActionableKind;
}

export interface TomorrowPreparationSummary {
  date: Date;
  dateKey: string;
  dayTypeLabel: string;
  firstTransitionLabel: string | null;
  keyMoments: TomorrowKeyMomentSummary[];
  debug?: TomorrowKeyMomentsDebugSnapshot;
}

export interface ScheduledTaskMomentInput {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  sortOrder: number;
  kind: PlanActionableKind;
  source?: "planned_instance" | "template_task";
  templateTaskId?: string | null;
  templateId?: string | null;
  assignedTo?: string | null;
  status?: TaskInstanceRow["status"] | "planned";
  dateKey?: string;
}

export interface TomorrowDateContext {
  timezone: string;
  todayDateKey: string;
  tomorrowDateKey: string;
  tomorrowDate: Date;
  tomorrowWeekday: number;
}

interface PlannedTaskMomentsResult {
  moments: ScheduledTaskMomentInput[];
  query: {
    table: "task_instances";
    criteria: {
      familyId: string | null;
      childId: string;
      date: string;
      excludedStatus: TaskInstanceRow["status"];
    };
    count: number;
    error: string | null;
  };
  rawRows: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    status: TaskInstanceRow["status"];
    itemKind: TaskInstanceRow["item_kind"];
    templateTaskId: string;
    templateId: string | null;
    assignedTo: string | null;
  }>;
}

export interface TomorrowKeyMomentsDebugCandidateItem {
  id: string;
  title: string;
  startTime: string;
  date: string;
  itemKind: PlanActionableKind;
  status: TaskInstanceRow["status"] | "planned";
  source: "planned_instance" | "template_task";
  templateId: string | null;
  assignedTo: string | null;
}

export interface TomorrowDebugTemplateResolution {
  resolvedTemplateId: string | null;
  resolvedTemplateName: string | null;
  resolvedTemplateReason: string;
  weekdayTemplatesCount: number;
  weekdayTemplates: Array<{
    id: string;
    name: string;
    weekday: number;
    isDefault: boolean;
    taskCount: number;
  }>;
}

export interface TomorrowDebugQueryDataset {
  table: "task_instances" | "template_tasks" | "scheduled_tasks";
  criteria: Record<string, string | number | null | string[]>;
  count: number;
  rows: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    assignedTo: string | null;
    itemKind: PlanActionableKind;
    status: TaskInstanceRow["status"] | "planned";
    templateId: string | null;
  }>;
  error?: string | null;
}

export interface TomorrowKeyMomentsDebugSnapshot {
  source: "planned_instances" | "template_tasks" | "merged" | "none";
  timezone: string;
  todayDateKey: string;
  tomorrowDateKey: string;
  tomorrowDate: string;
  rangeStartIso: string;
  rangeEndIso: string;
  childId: string | null;
  familyId: string | null;
  resolvedDayType: DayPeriod;
  templateResolution: TomorrowDebugTemplateResolution;
  plannedInstancesCount: number;
  templateTasksCount: number;
  keyMomentsCount: number;
  queries: {
    taskInstances: TomorrowDebugQueryDataset;
    templateTasks: TomorrowDebugQueryDataset;
    scheduledTasks: TomorrowDebugQueryDataset;
  };
  rawPlannedRows: PlannedTaskMomentsResult["rawRows"];
  plannedTaskMoments: ScheduledTaskMomentInput[];
  templateTaskMoments: ScheduledTaskMomentInput[];
  selectedMoments: ScheduledTaskMomentInput[];
  candidateItems: TomorrowKeyMomentsDebugCandidateItem[];
}

function isValidTimeLabel(value: string): boolean {
  return TIME_LABEL_PATTERN.test(value);
}

function getSortableTimeLabel(value: string): string {
  return isValidTimeLabel(value) ? value : "99:99";
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { year: 1970, month: 1, day: 1 };
  }

  return { year, month, day };
}

function formatDateKeyUtc(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parts = parseDateKey(dateKey);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKeyUtc(date);
}

function getDateFromDateKeyAtUtcNoon(dateKey: string): Date {
  const parts = parseDateKey(dateKey);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

export interface ScheduledChecklistInstanceSummary {
  id: string;
  date: string;
  label: string;
  type: string;
  sourceTemplateId: string | null;
  itemCount: number;
}

function getIsoWeekdayFromDateKey(dateKey: string): number {
  const date = getDateFromDateKeyAtUtcNoon(dateKey);
  const jsWeekday = date.getUTCDay();
  return jsWeekday === 0 ? 7 : jsWeekday;
}

function isRoutineTemplateActiveOnDateKey(
  template: ChecklistTemplateSummary,
  dateKey: string,
  schoolPeriods: SchoolPeriodSummary[],
): boolean {
  if (template.type !== "routine") {
    return false;
  }

  if (template.recurrenceStartDate && dateKey < template.recurrenceStartDate) {
    return false;
  }

  if (template.recurrenceEndDate && dateKey > template.recurrenceEndDate) {
    return false;
  }

  if (template.recurrenceRule === "daily") {
    return true;
  }

  const weekday = getIsoWeekdayFromDateKey(dateKey);
  if (template.recurrenceRule === "weekdays") {
    return weekday >= 1 && weekday <= 5;
  }

  if (template.recurrenceRule === "weekly_days") {
    return template.recurrenceDays.includes(weekday);
  }

  if (template.recurrenceRule === "school_days") {
    const dayContext = buildDayContext({
      date: getDateFromDateKeyAtUtcNoon(dateKey),
      periods: schoolPeriods,
      dayBlocks: [],
    });
    return dayContext.period === "ecole";
  }

  return false;
}

export function buildTomorrowDateContext(now: Date, timezone: string): TomorrowDateContext {
  const todayDateKey = getDateKeyInTimeZone(now, timezone);
  const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);
  const tomorrowDate = getDateFromDateKeyAtUtcNoon(tomorrowDateKey);

  return {
    timezone,
    todayDateKey,
    tomorrowDateKey,
    tomorrowDate,
    tomorrowWeekday: tomorrowDate.getUTCDay(),
  };
}

function shouldExposeTomorrowDebugSnapshot(): boolean {
  return process.env.NODE_ENV !== "production";
}

function shouldLogTomorrowDebugSnapshot(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.EZRA_DEBUG_TOMORROW_KEY_MOMENTS === "1"
  );
}

const dateTimeFormatterByTimeZone = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = dateTimeFormatterByTimeZone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  dateTimeFormatterByTimeZone.set(timezone, formatter);
  return formatter;
}

function getDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPart["type"],
): number {
  const value = Number(parts.find((part) => part.type === type)?.value ?? "0");
  return Number.isFinite(value) ? value : 0;
}

function toUtcDateFromTimeZoneDateTime(input: {
  dateKey: string;
  timezone: string;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}): Date {
  const parsed = parseDateKey(input.dateKey);
  let utcDate = new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      input.hour,
      input.minute,
      input.second,
      input.millisecond,
    ),
  );
  const targetUtcMs = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    input.hour,
    input.minute,
    input.second,
    0,
  );

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = getDateTimeFormatter(input.timezone).formatToParts(utcDate);
    const actualUtcMs = Date.UTC(
      getDateTimePart(parts, "year"),
      getDateTimePart(parts, "month") - 1,
      getDateTimePart(parts, "day"),
      getDateTimePart(parts, "hour"),
      getDateTimePart(parts, "minute"),
      getDateTimePart(parts, "second"),
      0,
    );
    const diffMs = targetUtcMs - actualUtcMs;
    if (diffMs === 0) {
      break;
    }

    utcDate = new Date(utcDate.getTime() + diffMs);
  }

  return new Date(utcDate.getTime() + input.millisecond);
}

function buildTomorrowDateRangeIso(input: { dateKey: string; timezone: string }): {
  startIso: string;
  endIso: string;
} {
  const rangeStart = toUtcDateFromTimeZoneDateTime({
    dateKey: input.dateKey,
    timezone: input.timezone,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const rangeEnd = toUtcDateFromTimeZoneDateTime({
    dateKey: input.dateKey,
    timezone: input.timezone,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });

  return {
    startIso: rangeStart.toISOString(),
    endIso: rangeEnd.toISOString(),
  };
}

function mapDayPeriodToLabel(period: DayPeriod): string {
  if (period === "weekend") {
    return "Week-end";
  }

  if (period === "jour_special" || period === "vacances") {
    return "Journee speciale";
  }

  return "Ecole";
}

function resolveTaskMomentKind(input: {
  itemKind?: PlanActionableKind | null;
  categoryDefaultKind?: PlanActionableKind | null;
}): PlanActionableKind {
  return input.itemKind ?? input.categoryDefaultKind ?? "mission";
}

function sortTaskMoments(moments: ScheduledTaskMomentInput[]): ScheduledTaskMomentInput[] {
  return [...moments].sort((left, right) => {
    const leftTime = getSortableTimeLabel(left.startTime);
    const rightTime = getSortableTimeLabel(right.startTime);

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildTomorrowKeyMoments(
  moments: ScheduledTaskMomentInput[],
): TomorrowKeyMomentSummary[] {
  return sortTaskMoments(moments)
    .slice(0, 5)
    .map((moment) => ({
      id: moment.id,
      startTime: moment.startTime,
      endTime: moment.endTime,
      timeLabel:
        moment.endTime && moment.endTime !== moment.startTime
          ? `${moment.startTime} - ${moment.endTime}`
          : moment.startTime,
      label: moment.label,
      kind: moment.kind,
    }));
}

function isValidScheduledTaskMoment(moment: ScheduledTaskMomentInput): boolean {
  return isValidTimeLabel(moment.startTime);
}

export function mergeTomorrowScheduledTaskMoments(input: {
  plannedTaskMoments: ScheduledTaskMomentInput[];
  templateTaskMoments: ScheduledTaskMomentInput[];
}): ScheduledTaskMomentInput[] {
  const validPlannedMoments = input.plannedTaskMoments.filter(isValidScheduledTaskMoment);
  const plannedTemplateTaskIds = new Set(
    validPlannedMoments
      .map((moment) => moment.templateTaskId)
      .filter((templateTaskId): templateTaskId is string => Boolean(templateTaskId)),
  );

  const templateBackfillMoments = input.templateTaskMoments.filter(
    (moment) =>
      isValidScheduledTaskMoment(moment) &&
      (!moment.templateTaskId || !plannedTemplateTaskIds.has(moment.templateTaskId)),
  );

  return sortTaskMoments([...validPlannedMoments, ...templateBackfillMoments]);
}

function buildDebugCandidateItems(input: {
  tomorrowDateKey: string;
  plannedTaskRawRows: PlannedTaskMomentsResult["rawRows"];
  plannedTaskMoments: ScheduledTaskMomentInput[];
  templateTaskMoments: ScheduledTaskMomentInput[];
}): TomorrowKeyMomentsDebugCandidateItem[] {
  const plannedRawById = new Map(input.plannedTaskRawRows.map((row) => [row.id, row]));

  const plannedCandidates = input.plannedTaskMoments.map((moment) => {
    const raw = plannedRawById.get(moment.id);
    return {
      id: moment.id,
      title: moment.label,
      startTime: moment.startTime,
      date: raw?.date ?? moment.dateKey ?? input.tomorrowDateKey,
      itemKind: raw?.itemKind ?? moment.kind,
      status: raw?.status ?? "a_faire",
      source: "planned_instance" as const,
      templateId: moment.templateId ?? raw?.templateId ?? null,
      assignedTo: moment.assignedTo ?? raw?.assignedTo ?? null,
      sortOrder: moment.sortOrder,
    };
  });

  const templateCandidates = input.templateTaskMoments.map((moment) => ({
    id: moment.id,
    title: moment.label,
    startTime: moment.startTime,
    date: moment.dateKey ?? input.tomorrowDateKey,
    itemKind: moment.kind,
    status: "planned" as const,
    source: "template_task" as const,
    templateId: moment.templateId ?? null,
    assignedTo: moment.assignedTo ?? null,
    sortOrder: moment.sortOrder,
  }));

  return [...plannedCandidates, ...templateCandidates]
    .sort((left, right) => {
      const leftTime = getSortableTimeLabel(left.startTime);
      const rightTime = getSortableTimeLabel(right.startTime);

      if (leftTime !== rightTime) {
        return leftTime.localeCompare(rightTime);
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, 10)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      startTime: candidate.startTime,
      date: candidate.date,
      itemKind: candidate.itemKind,
      status: candidate.status,
      source: candidate.source,
      templateId: candidate.templateId,
      assignedTo: candidate.assignedTo,
    }));
}

function buildTaskInstancesDebugRows(
  rows: PlannedTaskMomentsResult["rawRows"],
): TomorrowDebugQueryDataset["rows"] {
  return rows.slice(0, 10).map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.startTime,
    assignedTo: row.assignedTo,
    itemKind: row.itemKind,
    status: row.status,
    templateId: row.templateId,
  }));
}

function buildTemplateTasksDebugRows(
  moments: ScheduledTaskMomentInput[],
): TomorrowDebugQueryDataset["rows"] {
  return moments.slice(0, 10).map((moment) => ({
    id: moment.id,
    title: moment.label,
    date: moment.dateKey ?? "",
    startTime: moment.startTime,
    assignedTo: moment.assignedTo ?? null,
    itemKind: moment.kind,
    status: "planned",
    templateId: moment.templateId ?? null,
  }));
}

function buildTemplateTaskMoments(
  tasks: TemplateTaskSummary[],
  dateKey: string,
): ScheduledTaskMomentInput[] {
  return sortTemplateTasks(tasks).map((task) => ({
    id: task.id,
    startTime: task.startTime,
    endTime: task.endTime,
    label: task.title,
    sortOrder: task.sortOrder,
    kind: resolveTaskMomentKind({
      itemKind: task.itemKind ?? null,
      categoryDefaultKind: task.category.defaultItemKind ?? null,
    }),
    source: "template_task",
    templateTaskId: task.id,
    templateId: task.templateId,
    assignedTo: task.assignedProfileId ?? null,
    status: "planned",
    dateKey,
  }));
}

function resolveTomorrowTemplateSelection(input: {
  weekdayTemplates: TemplateWithTasks[];
  plannedRows: PlannedTaskMomentsResult["rawRows"];
}): {
  selectedTemplate: TemplateWithTasks | null;
  resolution: TomorrowDebugTemplateResolution;
} {
  const templateSummaries = input.weekdayTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    weekday: template.weekday,
    isDefault: template.isDefault,
    taskCount: template.tasks.length,
  }));

  const templateTaskToTemplateId = new Map<string, string>();
  input.weekdayTemplates.forEach((template) => {
    template.tasks.forEach((task) => {
      templateTaskToTemplateId.set(task.id, template.id);
    });
  });

  const plannedTemplateMatchCount = new Map<string, number>();
  input.plannedRows.forEach((row) => {
    const templateId = templateTaskToTemplateId.get(row.templateTaskId);
    if (!templateId) {
      return;
    }

    plannedTemplateMatchCount.set(templateId, (plannedTemplateMatchCount.get(templateId) ?? 0) + 1);
  });

  let selectedTemplate: TemplateWithTasks | null = null;
  let reason = "none";

  if (plannedTemplateMatchCount.size > 0) {
    selectedTemplate =
      input.weekdayTemplates
        .map((template) => ({
          template,
          matches: plannedTemplateMatchCount.get(template.id) ?? 0,
        }))
        .sort((left, right) => {
          if (left.matches !== right.matches) {
            return right.matches - left.matches;
          }

          if (left.template.isDefault !== right.template.isDefault) {
            return left.template.isDefault ? -1 : 1;
          }

          return right.template.tasks.length - left.template.tasks.length;
        })[0]?.template ?? null;
    reason = "planned_instance_template_match";
  }

  if (!selectedTemplate) {
    selectedTemplate =
      input.weekdayTemplates.find((template) => template.isDefault && template.tasks.length > 0) ??
      null;
    if (selectedTemplate) {
      reason = "default_template_with_tasks";
    }
  }

  if (!selectedTemplate) {
    selectedTemplate = input.weekdayTemplates.find((template) => template.tasks.length > 0) ?? null;
    if (selectedTemplate) {
      reason = "first_template_with_tasks";
    }
  }

  if (!selectedTemplate) {
    selectedTemplate = input.weekdayTemplates.find((template) => template.isDefault) ?? null;
    if (selectedTemplate) {
      reason = "default_template_empty";
    }
  }

  if (!selectedTemplate) {
    selectedTemplate = input.weekdayTemplates[0] ?? null;
    if (selectedTemplate) {
      reason = "first_weekday_template";
    }
  }

  return {
    selectedTemplate,
    resolution: {
      resolvedTemplateId: selectedTemplate?.id ?? null,
      resolvedTemplateName: selectedTemplate?.name ?? null,
      resolvedTemplateReason: reason,
      weekdayTemplatesCount: input.weekdayTemplates.length,
      weekdayTemplates: templateSummaries,
    },
  };
}

async function getPlannedTaskMomentsForTomorrow(input: {
  childProfileId: string;
  dateKey: string;
}): Promise<PlannedTaskMomentsResult> {
  const queryCriteria = {
    familyId: null as string | null,
    childId: input.childProfileId,
    date: input.dateKey,
    excludedStatus: "ignore" as TaskInstanceRow["status"],
  };

  if (!isSupabaseEnabled()) {
    return {
      moments: [],
      rawRows: [],
      query: {
        table: "task_instances",
        criteria: queryCriteria,
        count: 0,
        error: "supabase_disabled",
      },
    };
  }

  const context = await getCurrentProfile();
  queryCriteria.familyId = context.familyId ?? null;
  if (!context.familyId) {
    return {
      moments: [],
      rawRows: [],
      query: {
        table: "task_instances",
        criteria: queryCriteria,
        count: 0,
        error: "missing_family",
      },
    };
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === input.childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: plannedRows, error: plannedError } = await supabase
    .from("task_instances")
    .select(
      "id, template_task_id, item_kind, start_time, end_time, status, created_at, date, assigned_profile_id",
    )
    .eq("family_id", context.familyId)
    .eq("child_profile_id", input.childProfileId)
    .eq("date", input.dateKey)
    .neq("status", "ignore")
    .order("start_time", { ascending: true })
    .order("created_at", { ascending: true });

  if (plannedError || !plannedRows || plannedRows.length === 0) {
    return {
      moments: [],
      rawRows: [],
      query: {
        table: "task_instances",
        criteria: queryCriteria,
        count: plannedRows?.length ?? 0,
        error: plannedError?.message ?? null,
      },
    };
  }

  const typedPlannedRows = plannedRows as Pick<
    TaskInstanceRow,
    | "id"
    | "template_task_id"
    | "item_kind"
    | "start_time"
    | "end_time"
    | "status"
    | "date"
    | "assigned_profile_id"
  >[];
  const fallbackRawRows: PlannedTaskMomentsResult["rawRows"] = typedPlannedRows.map((row) => ({
    id: row.id,
    title: "Tache planifiee",
    date: row.date,
    startTime: normalizeTimeLabel(row.start_time),
    endTime: normalizeTimeLabel(row.end_time),
    status: row.status,
    itemKind: row.item_kind,
    templateTaskId: row.template_task_id,
    templateId: null,
    assignedTo: row.assigned_profile_id,
  }));

  const templateTaskIds = [
    ...new Set(
      typedPlannedRows
        .map((row) => row.template_task_id)
        .filter((taskId): taskId is string => Boolean(taskId)),
    ),
  ];

  if (templateTaskIds.length === 0) {
    return {
      moments: typedPlannedRows.map((row, index) => ({
        id: row.id,
        startTime: normalizeTimeLabel(row.start_time),
        endTime: normalizeTimeLabel(row.end_time),
        label: "Tache planifiee",
        sortOrder: index,
        kind: resolveTaskMomentKind({ itemKind: row.item_kind, categoryDefaultKind: null }),
        source: "planned_instance" as const,
        templateTaskId: row.template_task_id,
        templateId: null,
        assignedTo: row.assigned_profile_id,
        status: row.status,
        dateKey: row.date,
      })),
      rawRows: fallbackRawRows,
      query: {
        table: "task_instances",
        criteria: queryCriteria,
        count: typedPlannedRows.length,
        error: null,
      },
    };
  }

  const [
    { data: templateTaskRows, error: templateTaskError },
    { data: categoryRows, error: categoryError },
  ] = await Promise.all([
    supabase
      .from("template_tasks")
      .select("id, template_id, title, sort_order, item_kind, category_id, assigned_profile_id")
      .in("id", templateTaskIds),
    supabase
      .from("task_categories")
      .select("id, default_item_kind")
      .eq("family_id", context.familyId),
  ]);

  if (templateTaskError || categoryError || !templateTaskRows || !categoryRows) {
    return {
      moments: typedPlannedRows.map((row, index) => ({
        id: row.id,
        startTime: normalizeTimeLabel(row.start_time),
        endTime: normalizeTimeLabel(row.end_time),
        label: "Tache planifiee",
        sortOrder: index,
        kind: resolveTaskMomentKind({ itemKind: row.item_kind, categoryDefaultKind: null }),
        source: "planned_instance" as const,
        templateTaskId: row.template_task_id,
        templateId: null,
        assignedTo: row.assigned_profile_id,
        status: row.status,
        dateKey: row.date,
      })),
      rawRows: fallbackRawRows,
      query: {
        table: "task_instances",
        criteria: queryCriteria,
        count: typedPlannedRows.length,
        error: templateTaskError?.message ?? categoryError?.message ?? null,
      },
    };
  }

  const templateTaskById = new Map(
    (
      templateTaskRows as Pick<
        TemplateTaskRow,
        | "id"
        | "template_id"
        | "title"
        | "sort_order"
        | "item_kind"
        | "category_id"
        | "assigned_profile_id"
      >[]
    ).map((row) => [row.id, row]),
  );
  const categoryById = new Map(
    (categoryRows as Pick<TaskCategoryRow, "id" | "default_item_kind">[]).map((row) => [
      row.id,
      row,
    ]),
  );

  const moments: ScheduledTaskMomentInput[] = typedPlannedRows.map((row) => {
    const templateTask = templateTaskById.get(row.template_task_id);
    const category = templateTask ? categoryById.get(templateTask.category_id) : null;
    return {
      id: row.id,
      startTime: normalizeTimeLabel(row.start_time),
      endTime: normalizeTimeLabel(row.end_time),
      label: templateTask?.title ?? "Tache planifiee",
      sortOrder: templateTask?.sort_order ?? 9_999,
      kind: resolveTaskMomentKind({
        itemKind: row.item_kind ?? templateTask?.item_kind ?? null,
        categoryDefaultKind: category?.default_item_kind ?? null,
      }),
      source: "planned_instance" as const,
      templateTaskId: row.template_task_id,
      templateId: templateTask?.template_id ?? null,
      assignedTo: row.assigned_profile_id ?? templateTask?.assigned_profile_id ?? null,
      status: row.status,
      dateKey: row.date,
    };
  });

  const rawRows: PlannedTaskMomentsResult["rawRows"] = typedPlannedRows.map((row) => {
    const templateTask = templateTaskById.get(row.template_task_id);
    return {
      id: row.id,
      title: templateTask?.title ?? "Tache planifiee",
      date: row.date,
      startTime: normalizeTimeLabel(row.start_time),
      endTime: normalizeTimeLabel(row.end_time),
      status: row.status,
      itemKind: row.item_kind,
      templateTaskId: row.template_task_id,
      templateId: templateTask?.template_id ?? null,
      assignedTo: row.assigned_profile_id ?? templateTask?.assigned_profile_id ?? null,
    };
  });

  return {
    moments,
    rawRows,
    query: {
      table: "task_instances",
      criteria: queryCriteria,
      count: typedPlannedRows.length,
      error: null,
    },
  };
}

async function getTomorrowPreparationSummary(
  childProfileId: string | null,
): Promise<TomorrowPreparationSummary> {
  const familyLocation = await getFamilyLocationForCurrentFamily();
  const dateContext = buildTomorrowDateContext(new Date(), familyLocation.timezone);

  const [authContext, weekdayTemplates, schoolPeriods, plannedTaskResult] = await Promise.all([
    getCurrentProfile(),
    getTemplatesWithTasksForWeekday(dateContext.tomorrowWeekday),
    getSchoolPeriodsForCurrentFamily(),
    childProfileId
      ? getPlannedTaskMomentsForTomorrow({
          childProfileId,
          dateKey: dateContext.tomorrowDateKey,
        })
      : Promise.resolve<PlannedTaskMomentsResult>({
          moments: [],
          rawRows: [],
          query: {
            table: "task_instances",
            criteria: {
              familyId: null,
              childId: childProfileId ?? "",
              date: dateContext.tomorrowDateKey,
              excludedStatus: "ignore",
            },
            count: 0,
            error: "missing_child",
          },
        }),
  ]);

  const templateSelection = resolveTomorrowTemplateSelection({
    weekdayTemplates,
    plannedRows: plannedTaskResult.rawRows,
  });
  const selectedTemplate = templateSelection.selectedTemplate;
  const templateTaskMoments = sortTaskMoments(
    Array.from(
      new Map(
        weekdayTemplates
          .flatMap((template) =>
            buildTemplateTaskMoments(template.tasks, dateContext.tomorrowDateKey),
          )
          .map((moment) => [moment.templateTaskId ?? moment.id, moment]),
      ).values(),
    ),
  );
  const plannedTaskMoments = plannedTaskResult.moments;
  const selectedMoments = mergeTomorrowScheduledTaskMoments({
    plannedTaskMoments,
    templateTaskMoments,
  });
  const keyMoments = buildTomorrowKeyMoments(selectedMoments);
  const dayContext = buildDayContext({
    date: dateContext.tomorrowDate,
    periods: schoolPeriods,
    dayBlocks: selectedTemplate?.blocks ?? [],
  });
  const dateRange = buildTomorrowDateRangeIso({
    dateKey: dateContext.tomorrowDateKey,
    timezone: dateContext.timezone,
  });

  const hasPlannedMoments = selectedMoments.some((moment) => moment.source === "planned_instance");
  const hasTemplateMoments = selectedMoments.some((moment) => moment.source === "template_task");
  const source: TomorrowKeyMomentsDebugSnapshot["source"] =
    hasPlannedMoments && hasTemplateMoments
      ? "merged"
      : hasPlannedMoments
        ? "planned_instances"
        : hasTemplateMoments
          ? "template_tasks"
          : "none";

  const debugSnapshot: TomorrowKeyMomentsDebugSnapshot = {
    source,
    timezone: dateContext.timezone,
    todayDateKey: dateContext.todayDateKey,
    tomorrowDateKey: dateContext.tomorrowDateKey,
    tomorrowDate: dateContext.tomorrowDateKey,
    rangeStartIso: dateRange.startIso,
    rangeEndIso: dateRange.endIso,
    childId: childProfileId,
    familyId: authContext.familyId,
    resolvedDayType: dayContext.period,
    templateResolution: templateSelection.resolution,
    plannedInstancesCount: plannedTaskResult.query.count,
    templateTasksCount: templateTaskMoments.length,
    keyMomentsCount: keyMoments.length,
    queries: {
      taskInstances: {
        table: "task_instances",
        criteria: {
          ...plannedTaskResult.query.criteria,
          rangeStartIso: dateRange.startIso,
          rangeEndIso: dateRange.endIso,
          timezone: dateContext.timezone,
        },
        count: plannedTaskResult.query.count,
        rows: buildTaskInstancesDebugRows(plannedTaskResult.rawRows),
        error: plannedTaskResult.query.error,
      },
      templateTasks: {
        table: "template_tasks",
        criteria: {
          familyId: authContext.familyId,
          weekday: dateContext.tomorrowWeekday,
          templateId: selectedTemplate?.id ?? null,
          selectedTemplateReason: templateSelection.resolution.resolvedTemplateReason,
          weekdayTemplateIds: weekdayTemplates.map((template) => template.id),
          includedTemplateIds: [
            ...new Set(
              templateTaskMoments
                .map((moment) => moment.templateId)
                .filter((id): id is string => Boolean(id)),
            ),
          ],
        },
        count: templateTaskMoments.length,
        rows: buildTemplateTasksDebugRows(templateTaskMoments),
        error: null,
      },
      scheduledTasks: {
        table: "scheduled_tasks",
        criteria: {
          note: "no_separate_scheduled_tasks_table_queried",
          familyId: authContext.familyId,
          childId: childProfileId,
          date: dateContext.tomorrowDateKey,
        },
        count: 0,
        rows: [],
        error: null,
      },
    },
    rawPlannedRows: plannedTaskResult.rawRows,
    plannedTaskMoments,
    templateTaskMoments,
    selectedMoments,
    candidateItems: buildDebugCandidateItems({
      tomorrowDateKey: dateContext.tomorrowDateKey,
      plannedTaskRawRows: plannedTaskResult.rawRows,
      plannedTaskMoments,
      templateTaskMoments,
    }),
  };

  if (shouldLogTomorrowDebugSnapshot()) {
    console.info("[tomorrow:key-moments]", JSON.stringify(debugSnapshot));
  }

  return {
    date: dateContext.tomorrowDate,
    dateKey: dateContext.tomorrowDateKey,
    dayTypeLabel: mapDayPeriodToLabel(dayContext.period),
    firstTransitionLabel: keyMoments[0] ? `Depart a ${keyMoments[0].startTime}` : null,
    keyMoments,
    ...(shouldExposeTomorrowDebugSnapshot() ? { debug: debugSnapshot } : {}),
  };
}

export async function getChecklistTemplatesForCurrentFamily(): Promise<ChecklistTemplateSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoChecklistTemplates(context.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data: templatesData, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("family_id", context.familyId)
    .order("type", { ascending: true })
    .order("label", { ascending: true });

  if (templatesError || !templatesData || templatesData.length === 0) {
    return [];
  }

  const templateIds = templatesData.map((template) => template.id);

  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("*")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  const itemsByTemplateId = new Map<string, ChecklistItemRow[]>();
  (itemsData ?? []).forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    current.push(item as ChecklistItemRow);
    itemsByTemplateId.set(item.template_id, current);
  });

  return (templatesData as ChecklistTemplateRow[]).map((template) =>
    mapChecklistTemplate(template, itemsByTemplateId.get(template.id) ?? []),
  );
}

export async function getChecklistsForCurrentChildByDay(): Promise<ChecklistByDay> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { today: [], tomorrow: [] };
  }

  const familyLocation = await getFamilyLocationForCurrentFamily();
  const dateContext = buildTomorrowDateContext(new Date(), familyLocation.timezone);

  const entries = await getChecklistInstancesForChildAndDates(child.id, [
    dateContext.todayDateKey,
    dateContext.tomorrowDateKey,
  ]);

  return {
    today: entries.filter((instance) => instance.date === dateContext.todayDateKey),
    tomorrow: entries.filter((instance) => instance.date === dateContext.tomorrowDateKey),
  };
}

export async function getChecklistPageDataForCurrentChild(): Promise<ChecklistPageData> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  const tomorrow = await getTomorrowPreparationSummary(child?.id ?? null);
  if (!child) {
    return { child: null, byDay: { today: [], tomorrow: [] }, tomorrow };
  }

  const byDay = await getChecklistsForCurrentChildByDay();
  return {
    child,
    byDay,
    tomorrow,
  };
}

async function ensureChecklistRoutineInstancesForChildAndDates(
  familyId: string,
  childProfileId: string,
  dateKeys: string[],
  useAdminClient: boolean,
): Promise<void> {
  const targetDates = [...new Set(dateKeys)];
  if (targetDates.length === 0) {
    return;
  }

  const schoolPeriods = await getSchoolPeriodsForCurrentFamily();

  if (!isSupabaseEnabled()) {
    const routineTemplates = listDemoChecklistTemplates(familyId).filter(
      (template) => template.type === "routine",
    );

    for (const template of routineTemplates) {
      for (const dateKey of targetDates) {
        if (!isRoutineTemplateActiveOnDateKey(template, dateKey, schoolPeriods)) {
          continue;
        }
        ensureDemoChecklistInstanceForTemplateDate(familyId, childProfileId, template, dateKey);
      }
    }
    return;
  }

  const supabase = useAdminClient ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data: templatesData, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("family_id", familyId)
    .eq("type", "routine");

  if (templatesError || !templatesData || templatesData.length === 0) {
    return;
  }

  const templateRows = templatesData as ChecklistTemplateRow[];
  const templateIds = templateRows.map((template) => template.id);
  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("*")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  const itemsByTemplateId = new Map<string, ChecklistItemRow[]>();
  (itemsData ?? []).forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    current.push(item as ChecklistItemRow);
    itemsByTemplateId.set(item.template_id, current);
  });

  const templates = templateRows.map((template) =>
    mapChecklistTemplate(template, itemsByTemplateId.get(template.id) ?? []),
  );

  const { data: existingRows } = await supabase
    .from("checklist_instances")
    .select("date, source_template_id")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfileId)
    .in("date", targetDates)
    .in("source_template_id", templateIds);

  const existingKeys = new Set(
    (existingRows ?? [])
      .filter((row) => typeof row.source_template_id === "string")
      .map((row) => `${row.date}::${row.source_template_id}`),
  );

  for (const template of templates) {
    for (const dateKey of targetDates) {
      if (!isRoutineTemplateActiveOnDateKey(template, dateKey, schoolPeriods)) {
        continue;
      }

      const dedupeKey = `${dateKey}::${template.id}`;
      if (existingKeys.has(dedupeKey)) {
        continue;
      }

      const { data: created, error: createError } = await supabase
        .from("checklist_instances")
        .insert({
          family_id: familyId,
          child_profile_id: childProfileId,
          diary_entry_id: null,
          source_template_id: template.id,
          type: template.type,
          label: template.label,
          date: dateKey,
        })
        .select("id")
        .single();

      if (createError || !created) {
        continue;
      }

      if (template.items.length > 0) {
        await supabase.from("checklist_instance_items").insert(
          template.items.map((item, index) => ({
            checklist_instance_id: created.id,
            label: item.label,
            sort_order: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
          })),
        );
      }

      existingKeys.add(dedupeKey);
    }
  }
}

export async function getChecklistInstancesForChildAndDates(
  childProfileId: string,
  dateKeys: string[],
): Promise<ChecklistInstanceSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId || dateKeys.length === 0) {
    return [];
  }

  const normalizedDates = [...new Set(dateKeys)].sort();
  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  await ensureChecklistRoutineInstancesForChildAndDates(
    context.familyId,
    childProfileId,
    normalizedDates,
    shouldUseAdminClientForChildPin,
  );

  if (!isSupabaseEnabled()) {
    return listDemoChecklistInstancesByDates(context.familyId, childProfileId, normalizedDates);
  }

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: instancesData, error: instancesError } = await supabase
    .from("checklist_instances")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .in("date", normalizedDates)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (instancesError || !instancesData || instancesData.length === 0) {
    return [];
  }

  const instanceIds = instancesData.map((instance) => instance.id);

  const { data: itemsData } = await supabase
    .from("checklist_instance_items")
    .select("*")
    .in("checklist_instance_id", instanceIds)
    .order("sort_order", { ascending: true });

  const itemsByInstanceId = new Map<string, ChecklistInstanceItemRow[]>();
  (itemsData ?? []).forEach((item) => {
    const current = itemsByInstanceId.get(item.checklist_instance_id) ?? [];
    current.push(item as ChecklistInstanceItemRow);
    itemsByInstanceId.set(item.checklist_instance_id, current);
  });

  return (instancesData as ChecklistInstanceRow[]).map((instance) =>
    mapChecklistInstance(instance, itemsByInstanceId.get(instance.id) ?? []),
  );
}

export async function getChecklistSummaryForCurrentChild(): Promise<{
  todayCount: number;
  tomorrowCount: number;
}> {
  const byDay = await getChecklistsForCurrentChildByDay();
  return {
    todayCount: byDay.today.length,
    tomorrowCount: byDay.tomorrow.length,
  };
}

export async function getUncheckedChecklistCountForCurrentChild(): Promise<number> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return 0;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return 0;
  }

  const familyLocation = await getFamilyLocationForCurrentFamily();
  const dateContext = buildTomorrowDateContext(new Date(), familyLocation.timezone);
  const targetDates = [dateContext.todayDateKey, dateContext.tomorrowDateKey];

  if (!isSupabaseEnabled()) {
    const instances = listDemoChecklistInstancesByDates(context.familyId, child.id, targetDates);
    return instances
      .flatMap((instance) => instance.items)
      .filter((item) => !item.isChecked).length;
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === child.id &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: instancesData, error: instancesError } = await supabase
    .from("checklist_instances")
    .select("id")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", child.id)
    .in("date", targetDates);

  if (instancesError || !instancesData || instancesData.length === 0) {
    return 0;
  }

  const instanceIds = instancesData.map((instance) => instance.id);

  const { count, error: itemsError } = await supabase
    .from("checklist_instance_items")
    .select("id", { head: true, count: "exact" })
    .in("checklist_instance_id", instanceIds)
    .eq("is_checked", false);

  if (itemsError) {
    return 0;
  }

  return count ?? 0;
}

export async function getScheduledChecklistsForCurrentFamily(): Promise<ScheduledChecklistInstanceSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return [];
  }

  const familyLocation = await getFamilyLocationForCurrentFamily();
  const todayKey = getDateKeyInTimeZone(new Date(), familyLocation.timezone);

  if (!isSupabaseEnabled()) {
    const instances = listDemoChecklistInstancesForChildFromDate(
      context.familyId,
      child.id,
      todayKey,
    );

    return instances
      .filter((instance) => instance.diaryEntryId === null && instance.sourceTemplateId)
      .map((instance) => ({
        id: instance.id,
        date: instance.date,
        label: instance.label,
        type: instance.type,
        sourceTemplateId: instance.sourceTemplateId ?? null,
        itemCount: instance.items.length,
      }))
      .sort((left, right) => left.date.localeCompare(right.date) || left.label.localeCompare(right.label));
  }

  const supabase = await createSupabaseServerClient();
  const { data: instancesData, error } = await supabase
    .from("checklist_instances")
    .select("id, date, label, type, source_template_id, diary_entry_id")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", child.id)
    .gte("date", todayKey)
    .is("diary_entry_id", null)
    .not("source_template_id", "is", null)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !instancesData || instancesData.length === 0) {
    return [];
  }

  const instanceIds = instancesData.map((instance) => instance.id);
  const { data: itemsData } = await supabase
    .from("checklist_instance_items")
    .select("checklist_instance_id")
    .in("checklist_instance_id", instanceIds);

  const countByInstanceId = new Map<string, number>();
  (itemsData ?? []).forEach((item) => {
    countByInstanceId.set(item.checklist_instance_id, (countByInstanceId.get(item.checklist_instance_id) ?? 0) + 1);
  });

  return instancesData.map((instance) => ({
    id: instance.id,
    date: instance.date,
    label: instance.label,
    type: instance.type,
    sourceTemplateId: instance.source_template_id,
    itemCount: countByInstanceId.get(instance.id) ?? 0,
  }));
}
