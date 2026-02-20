import { getDateKeyFromDate } from "@/lib/day-templates/date";
import { getCurrentMinutes, timeToMinutes } from "@/lib/day-templates/time";
import type {
  DayContextSummary,
  DayMoment,
  DayPeriod,
  DayTemplateBlockSummary,
  SchoolPeriodSummary,
} from "@/lib/day-templates/types";

interface DerivedDayPeriod {
  period: DayPeriod;
  activePeriod: SchoolPeriodSummary | null;
  hasSchoolPeriodsConfigured: boolean;
}

export interface NextVacationSummary {
  label: string;
  startDate: string;
  daysUntil: number;
}

function daysBetween(startDate: Date, endDate: Date): number {
  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)));
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function isDateWithinRange(dateKey: string, startDate: string, endDate: string): boolean {
  return dateKey >= startDate && dateKey <= endDate;
}

export function deriveDayPeriod(date: Date, periods: SchoolPeriodSummary[]): DerivedDayPeriod {
  const dateKey = getDateKeyFromDate(date);
  const periodForDate = periods.find((period) => isDateWithinRange(dateKey, period.startDate, period.endDate)) ?? null;

  if (periodForDate?.periodType === "vacances") {
    return {
      period: "vacances",
      activePeriod: periodForDate,
      hasSchoolPeriodsConfigured: periods.length > 0,
    };
  }

  if (date.getDay() === 0 || date.getDay() === 6) {
    return {
      period: "weekend",
      activePeriod: periodForDate,
      hasSchoolPeriodsConfigured: periods.length > 0,
    };
  }

  if (periodForDate?.periodType === "jour_special") {
    return {
      period: "jour_special",
      activePeriod: periodForDate,
      hasSchoolPeriodsConfigured: periods.length > 0,
    };
  }

  return {
    period: "ecole",
    activePeriod: null,
    hasSchoolPeriodsConfigured: periods.length > 0,
  };
}

export function findNextVacation(date: Date, periods: SchoolPeriodSummary[]): NextVacationSummary | null {
  const dateKey = getDateKeyFromDate(date);
  const todayDate = parseDateKey(dateKey);

  const nextVacation = periods
    .filter((period) => period.periodType === "vacances" && period.startDate > dateKey)
    .sort((left, right) => left.startDate.localeCompare(right.startDate))[0];

  if (!nextVacation) {
    return null;
  }

  const daysUntil = daysBetween(todayDate, parseDateKey(nextVacation.startDate));

  return {
    label: nextVacation.label,
    startDate: nextVacation.startDate,
    daysUntil,
  };
}

export function getCurrentMoment(date: Date): DayMoment {
  const hour = date.getHours();
  if (hour < 12) {
    return "matin";
  }

  if (hour < 18) {
    return "apres-midi";
  }

  return "soir";
}

export function getMomentLabel(moment: DayMoment): string {
  if (moment === "matin") {
    return "Matin";
  }

  if (moment === "apres-midi") {
    return "Apres-midi";
  }

  return "Soir";
}

export function findActiveSchoolBlock(
  date: Date,
  blocks: DayTemplateBlockSummary[],
): DayTemplateBlockSummary | null {
  const currentMinutes = getCurrentMinutes(date);

  for (const block of blocks) {
    if (block.blockType !== "school") {
      continue;
    }

    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return block;
    }
  }

  return null;
}

function getPeriodChipLabel(period: DayPeriod): string {
  if (period === "vacances") {
    return "Vacances";
  }

  if (period === "weekend") {
    return "Week-end";
  }

  if (period === "jour_special") {
    return "Jour special";
  }

  return "Ecole";
}

function getCurrentContextLabel(input: {
  period: DayPeriod;
  isInSchoolBlock: boolean;
}): string {
  if (input.period === "vacances") {
    return "Vacances";
  }

  if (input.period === "weekend") {
    return "Week-end";
  }

  if (input.period === "jour_special") {
    return "Jour special";
  }

  if (input.isInSchoolBlock) {
    return "Ecole";
  }

  return "Temps a la maison";
}

export function buildDayContext(input: {
  date: Date;
  periods: SchoolPeriodSummary[];
  dayBlocks: DayTemplateBlockSummary[];
}): DayContextSummary {
  const derived = deriveDayPeriod(input.date, input.periods);
  const nextVacation = findNextVacation(input.date, input.periods);
  const activeSchoolBlock = findActiveSchoolBlock(input.date, input.dayBlocks);
  const moment = getCurrentMoment(input.date);

  return {
    period: derived.period,
    periodLabel: getPeriodChipLabel(derived.period),
    currentMoment: moment,
    currentContextLabel: getCurrentContextLabel({
      period: derived.period,
      isInSchoolBlock: Boolean(activeSchoolBlock),
    }),
    isInSchoolBlock: Boolean(activeSchoolBlock),
    activeSchoolBlockEndTime: activeSchoolBlock?.endTime ?? null,
    nextVacationStartDate: nextVacation?.startDate ?? null,
    nextVacationLabel: nextVacation?.label ?? null,
    daysUntilNextVacation: nextVacation?.daysUntil ?? null,
    hasSchoolPeriodsConfigured: derived.hasSchoolPeriodsConfigured,
  };
}
