import {
  buildWeatherNowUIFromCurrent,
  buildWeatherWeekUIFromForecast,
} from "@/lib/weather/forecast-aggregation";
import { getDateKeyInTimeZone, parseDateKeyToUtcDate } from "@/lib/weather/date";
import {
  fetchCurrentWeatherCarouge,
  fetchOneCallWeatherCarouge,
} from "@/lib/weather/openweathermap";
import {
  createDegradedWeatherWeekUIFromCurrent,
  createFallbackWeatherWeekUI,
  type DayUI,
  type WeatherWeekUI,
} from "@/lib/weather/types";

interface GetWeatherInput {
  timezone: string;
  selectedDateISO: string;
}

function resolveSelectedDateISO(input: GetWeatherInput): string {
  const parsedDate = parseDateKeyToUtcDate(input.selectedDateISO);
  if (parsedDate) {
    return input.selectedDateISO;
  }

  return getDateKeyInTimeZone(new Date(), input.timezone);
}

export function getWeatherDayFromWeek(week: WeatherWeekUI, dateISO: string): DayUI {
  const selectedDay = week.days.find((day) => day.dateISO === dateISO);
  if (selectedDay) {
    return selectedDay;
  }

  const fallbackDay = week.days[0];
  if (fallbackDay) {
    return fallbackDay;
  }

  const fallbackWeek = createFallbackWeatherWeekUI({
    timezone: week.location.timezone,
    selectedDateISO: dateISO,
  });
  const forcedFallbackDay = fallbackWeek.days[0];
  if (forcedFallbackDay) {
    return forcedFallbackDay;
  }

  throw new Error("Weather fallback day is missing.");
}

export async function getWeatherWeekUI(input: GetWeatherInput): Promise<WeatherWeekUI> {
  const selectedDateISO = resolveSelectedDateISO(input);

  try {
    const [oneCallResult, currentResult] = await Promise.all([
      fetchOneCallWeatherCarouge(),
      fetchCurrentWeatherCarouge(),
    ]);

    if (oneCallResult.ok) {
      const week = buildWeatherWeekUIFromForecast({
        forecast: oneCallResult.data,
        selectedDateISO,
        timezone: input.timezone,
        nowSource: currentResult.ok ? currentResult.data : oneCallResult.data.current,
      });

      if (week.days.length === 0) {
        return createFallbackWeatherWeekUI({
          timezone: input.timezone,
          selectedDateISO,
        });
      }

      return week;
    }

    if (currentResult.ok) {
      return createDegradedWeatherWeekUIFromCurrent({
        timezone: input.timezone,
        selectedDateISO,
        now: buildWeatherNowUIFromCurrent(currentResult.data),
      });
    }

    return createFallbackWeatherWeekUI({
      timezone: input.timezone,
      selectedDateISO,
    });
  } catch (error) {
    console.error("Failed to build weather week UI", error);
    return createFallbackWeatherWeekUI({
      timezone: input.timezone,
      selectedDateISO,
    });
  }
}

export async function getWeatherDayUI(input: {
  timezone: string;
  dateISO: string;
}): Promise<DayUI> {
  const week = await getWeatherWeekUI({
    timezone: input.timezone,
    selectedDateISO: input.dateISO,
  });

  return getWeatherDayFromWeek(week, input.dateISO);
}
