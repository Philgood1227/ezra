const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_INDEX_BY_SHORT_NAME: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateKeyFromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function parseDateKeyToUtcDate(dateKey: string): Date | undefined {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return undefined;
  }

  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function getDateKeyInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function isSameDateInTimeZone(left: Date, right: Date, timezone: string): boolean {
  return getDateKeyInTimeZone(left, timezone) === getDateKeyInTimeZone(right, timezone);
}

function getWeekdayIndexMondayFirst(date: Date, timezone: string): number {
  const weekdayShortName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);

  return WEEKDAY_INDEX_BY_SHORT_NAME[weekdayShortName] ?? 0;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const baseDate = parseDateKeyToUtcDate(dateKey);
  if (!baseDate) {
    return dateKey;
  }

  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return formatDateKeyFromUtcDate(baseDate);
}

export function getWeekDateKeys(date: Date, timezone: string): string[] {
  const dateKey = getDateKeyInTimeZone(date, timezone);
  const weekdayIndex = getWeekdayIndexMondayFirst(date, timezone);
  const mondayKey = addDaysToDateKey(dateKey, -weekdayIndex);

  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(mondayKey, index));
}

export function getDateKeyFromUnixTsWithOffset(timestampTs: number, timezoneOffsetSec: number): string {
  const shiftedDate = new Date((timestampTs + timezoneOffsetSec) * 1000);
  return formatDateKeyFromUtcDate(shiftedDate);
}

export function getHourFromUnixTsWithOffset(timestampTs: number, timezoneOffsetSec: number): number {
  return new Date((timestampTs + timezoneOffsetSec) * 1000).getUTCHours();
}

export function formatTimeLabelInTimeZone(
  timestampTs: number,
  timezone: string,
  locale = "fr-FR",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestampTs * 1000));
}

export function parseSelectedDateParam(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return parseDateKeyToUtcDate(value);
}
