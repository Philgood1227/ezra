import { getWeekDateKeys, parseDateKeyToUtcDate } from "@/lib/weather/date";

export type WeatherIconKey =
  | "storm"
  | "drizzle"
  | "rain"
  | "snow"
  | "fog"
  | "clear"
  | "partly_cloudy"
  | "cloudy";

export type PrecipLevel = "none" | "light" | "rain" | "heavy";
export type WeatherDataState = "ok" | "degraded" | "fallback";

export type WeatherBucketId = "morning" | "noon" | "afternoon" | "home" | "evening";

export interface WeatherNowUI {
  tempC: number | null;
  feelsLikeC: number | null;
  windKph: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  humidityPct: number | null;
  precipMm1h: number | null;
  icon: WeatherIconKey;
  summary: string | null;
}

export interface SunCycleUI {
  sunriseTs: number;
  sunsetTs: number;
  nowTs: number;
  dayProgress: number;
  sunriseLabel: string;
  sunsetLabel: string;
}

export interface BucketUI {
  id: WeatherBucketId;
  label: string;
  startHour: number;
  endHour: number;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  icon: WeatherIconKey;
  summary: string;
  popPct: number;
  precipLevel: PrecipLevel;
  microLabel: string;
}

export interface DayUI {
  dateISO: string;
  dowShort: string;
  dayOfMonth: number;
  minC: number | null;
  maxC: number | null;
  icon: WeatherIconKey;
  summary: string | null;
  popMaxPct: number;
  precipLevel: PrecipLevel;
  sun: SunCycleUI | null;
  buckets: BucketUI[];
}

export interface WeatherWeekUI {
  location: {
    label: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  dataState: WeatherDataState;
  generatedAtTs: number;
  now: WeatherNowUI;
  days: DayUI[];
}

export const WEATHER_BUCKET_DEFINITIONS: ReadonlyArray<{
  id: WeatherBucketId;
  label: string;
  startHour: number;
  endHour: number;
}> = [
  { id: "morning", label: "Matin", startHour: 6, endHour: 11 },
  { id: "noon", label: "Midi", startHour: 12, endHour: 13 },
  { id: "afternoon", label: "Apres-midi", startHour: 14, endHour: 17 },
  { id: "home", label: "Maison", startHour: 18, endHour: 19 },
  { id: "evening", label: "Soir", startHour: 20, endHour: 23 },
] as const;

const WEATHER_ICON_EMOJIS: Record<WeatherIconKey, string> = {
  storm: "\u26c8\ufe0f",
  drizzle: "\ud83c\udf26\ufe0f",
  rain: "\ud83c\udf27\ufe0f",
  snow: "\u2744\ufe0f",
  fog: "\ud83c\udf2b\ufe0f",
  clear: "\u2600\ufe0f",
  partly_cloudy: "\u26c5",
  cloudy: "\u2601\ufe0f",
};

function toFrenchWeekdayShort(dateISO: string, timezone: string): string {
  const parsed = parseDateKeyToUtcDate(dateISO);
  if (!parsed) {
    return "";
  }

  const short = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "short",
  })
    .format(parsed)
    .replace(".", "");

  return short.charAt(0).toUpperCase() + short.slice(1);
}

function toDayOfMonth(dateISO: string): number {
  const parsed = parseDateKeyToUtcDate(dateISO);
  if (!parsed) {
    return 0;
  }

  return parsed.getUTCDate();
}

function toWeekDays(input: {
  timezone: string;
  selectedDateISO: string;
  icon: WeatherIconKey;
}): DayUI[] {
  const selectedDate = parseDateKeyToUtcDate(input.selectedDateISO) ?? new Date();
  const weekDateKeys = getWeekDateKeys(selectedDate, input.timezone);

  return weekDateKeys.map((dateISO) => ({
    dateISO,
    dowShort: toFrenchWeekdayShort(dateISO, input.timezone),
    dayOfMonth: toDayOfMonth(dateISO),
    minC: null,
    maxC: null,
    icon: input.icon,
    summary: null,
    popMaxPct: 0,
    precipLevel: "none",
    sun: null,
    buckets: [],
  }));
}

export function getWeatherIconEmoji(icon: WeatherIconKey): string {
  return WEATHER_ICON_EMOJIS[icon] ?? WEATHER_ICON_EMOJIS.cloudy;
}

export function createFallbackWeatherWeekUI(input: {
  timezone: string;
  selectedDateISO: string;
  locationLabel?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): WeatherWeekUI {
  return {
    location: {
      label: input.locationLabel ?? "Carouge, CH",
      latitude: input.latitude ?? 46.1816,
      longitude: input.longitude ?? 6.139,
      timezone: input.timezone,
    },
    dataState: "fallback",
    generatedAtTs: Math.floor(Date.now() / 1000),
    now: {
      tempC: null,
      feelsLikeC: null,
      windKph: null,
      tempMinC: null,
      tempMaxC: null,
      humidityPct: null,
      precipMm1h: null,
      icon: "cloudy",
      summary: null,
    },
    days: toWeekDays({
      timezone: input.timezone,
      selectedDateISO: input.selectedDateISO,
      icon: "cloudy",
    }),
  };
}

export function createDegradedWeatherWeekUIFromCurrent(input: {
  timezone: string;
  selectedDateISO: string;
  now: WeatherNowUI;
  locationLabel?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): WeatherWeekUI {
  return {
    location: {
      label: input.locationLabel ?? "Carouge, CH",
      latitude: input.latitude ?? 46.1816,
      longitude: input.longitude ?? 6.139,
      timezone: input.timezone,
    },
    dataState: "degraded",
    generatedAtTs: Math.floor(Date.now() / 1000),
    now: input.now,
    days: toWeekDays({
      timezone: input.timezone,
      selectedDateISO: input.selectedDateISO,
      icon: input.now.icon,
    }),
  };
}

export function getDayFromWeatherWeek(
  week: WeatherWeekUI,
  dateISO: string,
): DayUI | undefined {
  return week.days.find((day) => day.dateISO === dateISO) ?? week.days[0];
}

