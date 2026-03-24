import {
  formatTimeLabelInTimeZone,
  getDateKeyFromUnixTsWithOffset,
  getHourFromUnixTsWithOffset,
  parseDateKeyToUtcDate,
} from "@/lib/weather/date";
import type {
  OpenWeatherCurrentNormalized,
  OpenWeatherHourlyNormalized,
  OpenWeatherOneCallNormalized,
} from "@/lib/weather/openweathermap";
import type {
  BucketUI,
  DayUI,
  PrecipLevel,
  SunCycleUI,
  WeatherIconKey,
  WeatherNowUI,
  WeatherWeekUI,
} from "@/lib/weather/types";
import { WEATHER_BUCKET_DEFINITIONS } from "@/lib/weather/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToInt(value: number): number {
  return Math.round(value);
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function getWeatherIconFrequency(entries: OpenWeatherHourlyNormalized[]): Map<WeatherIconKey, number> {
  const frequencies = new Map<WeatherIconKey, number>();

  for (const entry of entries) {
    const iconKey = iconKeyFromWeatherId(entry.weatherId);
    frequencies.set(iconKey, (frequencies.get(iconKey) ?? 0) + 1);
  }

  return frequencies;
}

function getDominantIcon(entries: OpenWeatherHourlyNormalized[]): WeatherIconKey {
  if (entries.length === 0) {
    return "cloudy";
  }

  const frequencies = getWeatherIconFrequency(entries);
  let bestIcon: WeatherIconKey = "cloudy";
  let bestCount = -1;

  for (const [iconKey, count] of frequencies.entries()) {
    if (count > bestCount) {
      bestIcon = iconKey;
      bestCount = count;
    }
  }

  return bestIcon;
}

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

function toBucketSummary(entries: OpenWeatherHourlyNormalized[]): string {
  const description = entries[0]?.summary?.trim();
  return description ? capitalize(description) : "Donnees indisponibles";
}

function findClosestEntryForHour(
  entries: OpenWeatherHourlyNormalized[],
  timezoneOffsetSec: number,
  targetHour: number,
): OpenWeatherHourlyNormalized | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce<OpenWeatherHourlyNormalized | undefined>((best, entry) => {
    const entryHour = getHourFromUnixTsWithOffset(entry.timestampTs, timezoneOffsetSec);
    if (!best) {
      return entry;
    }

    const bestHour = getHourFromUnixTsWithOffset(best.timestampTs, timezoneOffsetSec);
    const bestDistance = Math.abs(bestHour - targetHour);
    const currentDistance = Math.abs(entryHour - targetHour);
    return currentDistance < bestDistance ? entry : best;
  }, undefined);
}

export function iconKeyFromWeatherId(weatherId: number): WeatherIconKey {
  if (weatherId >= 200 && weatherId <= 232) {
    return "storm";
  }

  if (weatherId >= 300 && weatherId <= 321) {
    return "drizzle";
  }

  if (weatherId >= 500 && weatherId <= 531) {
    return "rain";
  }

  if (weatherId >= 600 && weatherId <= 622) {
    return "snow";
  }

  if (weatherId >= 701 && weatherId <= 781) {
    return "fog";
  }

  if (weatherId === 800) {
    return "clear";
  }

  if (weatherId === 801 || weatherId === 802) {
    return "partly_cloudy";
  }

  return "cloudy";
}

export function precipLevelFromPop(popPct: number): PrecipLevel {
  if (popPct < 20) {
    return "none";
  }

  if (popPct < 50) {
    return "light";
  }

  if (popPct < 80) {
    return "rain";
  }

  return "heavy";
}

export function microLabelFromPop(popPct: number): string {
  if (popPct < 20) {
    return "Pas de pluie";
  }

  if (popPct < 50) {
    return "Petite pluie possible";
  }

  if (popPct < 80) {
    return "Pluie probable";
  }

  return "Grosse pluie";
}

export function aggregateHourlyToBuckets(
  hourly: OpenWeatherHourlyNormalized[],
  dayStartTs: number,
  timezoneOffsetSec: number,
): BucketUI[] {
  const dayDateKey = getDateKeyFromUnixTsWithOffset(dayStartTs, timezoneOffsetSec);
  const hourlyForDay = hourly.filter(
    (entry) => getDateKeyFromUnixTsWithOffset(entry.timestampTs, timezoneOffsetSec) === dayDateKey,
  );

  return WEATHER_BUCKET_DEFINITIONS.map((bucket) => {
    const bucketEntries = hourlyForDay.filter((entry) => {
      const entryHour = getHourFromUnixTsWithOffset(entry.timestampTs, timezoneOffsetSec);
      return entryHour >= bucket.startHour && entryHour <= bucket.endHour;
    });

    const sourceEntries =
      bucketEntries.length > 0
        ? bucketEntries
        : (() => {
            const closestEntry = findClosestEntryForHour(
              hourlyForDay.length > 0 ? hourlyForDay : hourly,
              timezoneOffsetSec,
              bucket.startHour,
            );
            return closestEntry ? [closestEntry] : [];
          })();

    const popMaxPct = sourceEntries.reduce(
      (highest, entry) => Math.max(highest, entry.popPct),
      0,
    );

    return {
      id: bucket.id,
      label: bucket.label,
      startHour: bucket.startHour,
      endHour: bucket.endHour,
      tempC: roundToInt(average(sourceEntries.map((entry) => entry.tempC))),
      feelsLikeC: roundToInt(average(sourceEntries.map((entry) => entry.feelsLikeC))),
      windKph: roundToInt(average(sourceEntries.map((entry) => entry.windKph))),
      icon: getDominantIcon(sourceEntries),
      summary: toBucketSummary(sourceEntries),
      popPct: popMaxPct,
      precipLevel: precipLevelFromPop(popMaxPct),
      microLabel: microLabelFromPop(popMaxPct),
    };
  });
}

export function buildSunCycleUI(input: {
  sunriseTs: number;
  sunsetTs: number;
  nowTs: number;
  timezone: string;
}): SunCycleUI {
  const dayDuration = input.sunsetTs - input.sunriseTs;
  const unclampedProgress =
    dayDuration > 0 ? (input.nowTs - input.sunriseTs) / dayDuration : 0;
  const dayProgress = clamp(unclampedProgress, 0, 1);

  return {
    sunriseTs: input.sunriseTs,
    sunsetTs: input.sunsetTs,
    nowTs: input.nowTs,
    dayProgress,
    sunriseLabel: formatTimeLabelInTimeZone(input.sunriseTs, input.timezone),
    sunsetLabel: formatTimeLabelInTimeZone(input.sunsetTs, input.timezone),
  };
}

export function buildWeatherNowUIFromCurrent(
  current: OpenWeatherCurrentNormalized,
): WeatherNowUI {
  return {
    tempC: roundToInt(current.tempC),
    feelsLikeC: roundToInt(current.feelsLikeC),
    windKph: roundToInt(current.windKph),
    tempMinC: roundToInt(current.tempMinC),
    tempMaxC: roundToInt(current.tempMaxC),
    humidityPct: roundToInt(current.humidityPct),
    precipMm1h: Math.round(current.precipMm1h * 10) / 10,
    icon: iconKeyFromWeatherId(current.weatherId),
    summary: capitalize(current.summary),
  };
}

function toDayUI(input: {
  forecast: OpenWeatherOneCallNormalized;
  selectedDateISO: string;
  day: OpenWeatherOneCallNormalized["daily"][number];
  nowSource: OpenWeatherCurrentNormalized;
  timezone: string;
}): DayUI {
  const dateISO = getDateKeyFromUnixTsWithOffset(
    input.day.timestampTs,
    input.forecast.timezoneOffsetSec,
  );
  const buckets = aggregateHourlyToBuckets(
    input.forecast.hourly,
    input.day.timestampTs,
    input.forecast.timezoneOffsetSec,
  );
  const popMaxPct = Math.max(
    input.day.popPct,
    ...buckets.map((bucket) => bucket.popPct),
  );

  const nowTsForDay =
    dateISO === input.selectedDateISO ? input.nowSource.timestampTs : input.day.sunriseTs;

  return {
    dateISO,
    dowShort: toFrenchWeekdayShort(dateISO, input.timezone),
    dayOfMonth: toDayOfMonth(dateISO),
    minC: roundToInt(input.day.minC),
    maxC: roundToInt(input.day.maxC),
    icon: iconKeyFromWeatherId(input.day.weatherId),
    summary: capitalize(input.day.summary),
    popMaxPct,
    precipLevel: precipLevelFromPop(popMaxPct),
    sun: buildSunCycleUI({
      sunriseTs: input.day.sunriseTs,
      sunsetTs: input.day.sunsetTs,
      nowTs: nowTsForDay,
      timezone: input.timezone,
    }),
    buckets,
  };
}

export function buildWeatherWeekUIFromForecast(input: {
  forecast: OpenWeatherOneCallNormalized;
  selectedDateISO: string;
  timezone: string;
  nowSource?: OpenWeatherCurrentNormalized | undefined;
}): WeatherWeekUI {
  const nowSource = input.nowSource ?? input.forecast.current;
  const days = input.forecast.daily.slice(0, 7).map((day) =>
    toDayUI({
      forecast: input.forecast,
      selectedDateISO: input.selectedDateISO,
      day,
      nowSource,
      timezone: input.timezone,
    }),
  );

  return {
    location: {
      label: "Carouge, CH",
      latitude: input.forecast.latitude,
      longitude: input.forecast.longitude,
      timezone: input.forecast.timezone,
    },
    dataState: "ok",
    generatedAtTs: input.forecast.generatedAtTs,
    now: buildWeatherNowUIFromCurrent(nowSource),
    days,
  };
}
