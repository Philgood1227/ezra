import { minutesToTimeLabel } from "@/lib/day-templates/time";
import type { FamilyLocation } from "@/lib/time/family-location";
import { getDateKeyInTimeZone as getWeatherDateKeyInTimeZone } from "@/lib/weather/date";

export type DaylightSource = "api" | "fallback";
export type DaytimeSegmentId = "nuit" | "matin" | "midi" | "apres-midi" | "soir";

export interface DaylightSnapshot {
  dateKey: string;
  timezone: string;
  source: DaylightSource;
  sunriseMinutes: number;
  solarNoonMinutes: number;
  sunsetMinutes: number;
  midnightMinutes: number;
  sunriseLabel: string;
  solarNoonLabel: string;
  sunsetLabel: string;
}

export const DAYTIME_SEGMENT_LABELS: Record<DaytimeSegmentId, string> = {
  nuit: "Nuit",
  matin: "Matin",
  midi: "Midi",
  "apres-midi": "Apr\u00E8s-midi",
  soir: "Soir",
};

export const DAYTIME_SEGMENT_ORDER: DaytimeSegmentId[] = ["matin", "midi", "apres-midi", "soir", "nuit"];

interface SunriseSunsetApiResponse {
  status?: string;
  results?: {
    sunrise?: string;
    sunset?: string;
    solar_noon?: string;
  };
}

const FALLBACK_SUNRISE_MINUTES_BY_MONTH = [
  8 * 60 + 5,
  7 * 60 + 35,
  6 * 60 + 45,
  6 * 60 + 45,
  5 * 60 + 55,
  5 * 60 + 40,
  5 * 60 + 55,
  6 * 60 + 35,
  7 * 60 + 15,
  7 * 60 + 55,
  7 * 60 + 35,
  8 * 60 + 5,
];

const FALLBACK_SUNSET_MINUTES_BY_MONTH = [
  17 * 60 + 10,
  18 * 60,
  18 * 60 + 50,
  20 * 60 + 20,
  21 * 60,
  21 * 60 + 25,
  21 * 60 + 10,
  20 * 60 + 25,
  19 * 60 + 20,
  18 * 60 + 20,
  17 * 60 + 30,
  17 * 60,
];

const timeFormattersByTimeZone = new Map<string, Intl.DateTimeFormat>();
const dateFormattersByTimeZone = new Map<string, Intl.DateTimeFormat>();
const longDateFormattersByTimeZone = new Map<string, Intl.DateTimeFormat>();

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart["type"]): string | null {
  return parts.find((part) => part.type === type)?.value ?? null;
}

function getTimeFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = timeFormattersByTimeZone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  timeFormattersByTimeZone.set(timezone, formatter);
  return formatter;
}

function getDateFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = dateFormattersByTimeZone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  dateFormattersByTimeZone.set(timezone, formatter);
  return formatter;
}

function getLongDateFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = longDateFormattersByTimeZone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  longDateFormattersByTimeZone.set(timezone, formatter);
  return formatter;
}

function clampToDay(minutes: number): number {
  return Math.max(0, Math.min(23 * 60 + 59, minutes));
}

function normalizeNoonMinutes(input: {
  sunriseMinutes: number;
  sunsetMinutes: number;
  solarNoonMinutes: number | null;
}): number {
  if (input.solarNoonMinutes != null) {
    const normalized = clampToDay(input.solarNoonMinutes);
    if (normalized > input.sunriseMinutes && normalized < input.sunsetMinutes) {
      return normalized;
    }
  }

  return Math.round((input.sunriseMinutes + input.sunsetMinutes) / 2);
}

function buildDaylightSnapshot(input: {
  dateKey: string;
  timezone: string;
  source: DaylightSource;
  sunriseMinutes: number;
  sunsetMinutes: number;
  solarNoonMinutes: number;
}): DaylightSnapshot {
  const sunriseMinutes = clampToDay(input.sunriseMinutes);
  const sunsetMinutes = clampToDay(input.sunsetMinutes);
  const solarNoonMinutes = clampToDay(input.solarNoonMinutes);

  return {
    dateKey: input.dateKey,
    timezone: input.timezone,
    source: input.source,
    sunriseMinutes,
    solarNoonMinutes,
    sunsetMinutes,
    midnightMinutes: 0,
    sunriseLabel: minutesToTimeLabel(sunriseMinutes),
    solarNoonLabel: minutesToTimeLabel(solarNoonMinutes),
    sunsetLabel: minutesToTimeLabel(sunsetMinutes),
  };
}

function parseApiTimeToMinutes(value: string | undefined, timezone: string): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return getMinutesInTimeZone(date, timezone);
}

function getMonthIndexInTimeZone(date: Date, timezone: string): number {
  const formatter = getDateFormatter(timezone);
  const parts = formatter.formatToParts(date);
  const monthPart = getPart(parts, "month");
  const parsedMonth = Number(monthPart);
  if (!Number.isFinite(parsedMonth)) {
    return date.getMonth();
  }

  return Math.min(11, Math.max(0, parsedMonth - 1));
}

function toTitleCase(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const getDateKeyInTimeZone = getWeatherDateKeyInTimeZone;

export function formatFrenchDateInTimeZone(date: Date, timezone: string): string {
  const formatter = getLongDateFormatter(timezone);
  return toTitleCase(formatter.format(date));
}

export function getMinutesInTimeZone(date: Date, timezone: string): number {
  const formatter = getTimeFormatter(timezone);
  const parts = formatter.formatToParts(date);
  const hours = Number(getPart(parts, "hour") ?? "0");
  const minutes = Number(getPart(parts, "minute") ?? "0");

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return clampToDay(hours * 60 + minutes);
}

export function classifyDaytimeSegment(input: {
  currentMinutes: number;
  sunriseMinutes: number;
  solarNoonMinutes: number;
  sunsetMinutes: number;
}): DaytimeSegmentId {
  const currentMinutes = clampToDay(input.currentMinutes);
  const sunriseMinutes = clampToDay(input.sunriseMinutes);
  const solarNoonMinutes = clampToDay(input.solarNoonMinutes);
  const sunsetMinutes = clampToDay(input.sunsetMinutes);

  if (currentMinutes < sunriseMinutes) {
    return "nuit";
  }

  if (currentMinutes < solarNoonMinutes) {
    return "matin";
  }

  const midiLimit = Math.min(sunsetMinutes, solarNoonMinutes + 45);
  if (currentMinutes < midiLimit) {
    return "midi";
  }

  if (currentMinutes < sunsetMinutes) {
    return "apres-midi";
  }

  const eveningLimit = Math.min(24 * 60, sunsetMinutes + 180);
  if (currentMinutes < eveningLimit) {
    return "soir";
  }

  return "nuit";
}

export function classifyDaytimeSegmentFromSnapshot(date: Date, snapshot: DaylightSnapshot): DaytimeSegmentId {
  const currentMinutes = getMinutesInTimeZone(date, snapshot.timezone);
  return classifyDaytimeSegment({
    currentMinutes,
    sunriseMinutes: snapshot.sunriseMinutes,
    solarNoonMinutes: snapshot.solarNoonMinutes,
    sunsetMinutes: snapshot.sunsetMinutes,
  });
}

export function getFallbackDaylightSnapshot(date: Date, location: FamilyLocation): DaylightSnapshot {
  const monthIndex = getMonthIndexInTimeZone(date, location.timezone);
  const sunriseMinutes = FALLBACK_SUNRISE_MINUTES_BY_MONTH[monthIndex] ?? 7 * 60;
  const sunsetMinutes = FALLBACK_SUNSET_MINUTES_BY_MONTH[monthIndex] ?? 18 * 60;
  const solarNoonMinutes = Math.round((sunriseMinutes + sunsetMinutes) / 2);

  return buildDaylightSnapshot({
    dateKey: getDateKeyInTimeZone(date, location.timezone),
    timezone: location.timezone,
    source: "fallback",
    sunriseMinutes,
    solarNoonMinutes,
    sunsetMinutes,
  });
}

export async function getDaylightSnapshotForLocation(input: {
  date: Date;
  location: FamilyLocation;
}): Promise<DaylightSnapshot> {
  const fallback = getFallbackDaylightSnapshot(input.date, input.location);
  const dateKey = getDateKeyInTimeZone(input.date, input.location.timezone);
  const url = new URL("https://api.sunrise-sunset.org/json");
  url.searchParams.set("lat", String(input.location.latitude));
  url.searchParams.set("lng", String(input.location.longitude));
  url.searchParams.set("formatted", "0");
  url.searchParams.set("date", dateKey);

  try {
    const response = await fetch(url.toString(), { cache: "force-cache" });
    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as SunriseSunsetApiResponse;
    if (payload.status !== "OK" || !payload.results) {
      return fallback;
    }

    const sunriseMinutes = parseApiTimeToMinutes(payload.results.sunrise, input.location.timezone);
    const sunsetMinutes = parseApiTimeToMinutes(payload.results.sunset, input.location.timezone);
    const apiNoonMinutes = parseApiTimeToMinutes(payload.results.solar_noon, input.location.timezone);

    if (sunriseMinutes == null || sunsetMinutes == null || sunriseMinutes >= sunsetMinutes) {
      return fallback;
    }

    const solarNoonMinutes = normalizeNoonMinutes({
      sunriseMinutes,
      sunsetMinutes,
      solarNoonMinutes: apiNoonMinutes,
    });

    return buildDaylightSnapshot({
      dateKey,
      timezone: input.location.timezone,
      source: "api",
      sunriseMinutes,
      solarNoonMinutes,
      sunsetMinutes,
    });
  } catch {
    return fallback;
  }
}
