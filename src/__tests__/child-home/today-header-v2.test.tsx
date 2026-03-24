import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayHeader } from "@/components/child/today/today-header";
import type { TimeBlockId } from "@/components/child/today/types";
import {
  WEATHER_BUCKET_DEFINITIONS,
  createFallbackWeatherWeekUI,
  type WeatherWeekUI,
} from "@/lib/weather/types";

const SEGMENTS: Array<{ id: TimeBlockId; label: string }> = [
  { id: "morning", label: "Matin" },
  { id: "noon", label: "Midi" },
  { id: "afternoon", label: "Apres-midi" },
  { id: "home", label: "Maison" },
  { id: "evening", label: "Soir" },
];

function buildWeatherWeekOk(): WeatherWeekUI {
  const week = createFallbackWeatherWeekUI({
    timezone: "Europe/Zurich",
    selectedDateISO: "2026-02-18",
  });

  week.dataState = "ok";
  week.now = {
    tempC: 8,
    feelsLikeC: 7,
    windKph: 11,
    tempMinC: 4,
    tempMaxC: 12,
    humidityPct: 65,
    precipMm1h: 0.2,
    icon: "partly_cloudy",
    summary: "Nuageux",
  };

  const selectedDay = week.days.find((day) => day.dateISO === "2026-02-18");
  if (selectedDay) {
    selectedDay.minC = 4;
    selectedDay.maxC = 9;
    selectedDay.icon = "partly_cloudy";
    selectedDay.summary = "Nuageux";
    selectedDay.sun = {
      sunriseTs: 1_771_980_000,
      sunsetTs: 1_772_020_000,
      nowTs: 1_772_000_000,
      dayProgress: 0.5,
      sunriseLabel: "07:15",
      sunsetLabel: "18:25",
    };
    selectedDay.buckets = WEATHER_BUCKET_DEFINITIONS.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      startHour: bucket.startHour,
      endHour: bucket.endHour,
      tempC: bucket.startHour,
      feelsLikeC: bucket.startHour - 1,
      windKph: 12,
      icon: bucket.id === "afternoon" ? "partly_cloudy" : "cloudy",
      summary: "Nuageux",
      popPct: 20,
      precipLevel: "light",
      microLabel: `Apercu ${bucket.label}`,
    }));
  }

  return week;
}

function buildWeatherWeekDegraded(): WeatherWeekUI {
  const week = createFallbackWeatherWeekUI({
    timezone: "Europe/Zurich",
    selectedDateISO: "2026-02-18",
  });
  week.dataState = "degraded";
  week.now = {
    tempC: 8,
    feelsLikeC: 7,
    windKph: 12,
    tempMinC: 4,
    tempMaxC: 9,
    humidityPct: 70,
    precipMm1h: 0.4,
    icon: "partly_cloudy",
    summary: "Nuageux",
  };
  return week;
}

describe("TodayHeader v2", () => {
  it("renders the md+ two-column structure with WeekdayStrip and WeatherPanel", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={buildWeatherWeekOk()}
        selectedDateISO="2026-02-18"
        currentSegmentId="afternoon"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
      />,
    );

    expect(screen.getByTestId("today-header")).toBeInTheDocument();
    expect(screen.getByText(/Aujourd'hui -/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reglages|R\u00E9glages/i })).not.toBeInTheDocument();

    expect(screen.getByTestId("today-week-strip")).toBeInTheDocument();
    expect(screen.getByTestId("today-header-quick-nav")).toBeInTheDocument();
    expect(screen.getByTestId("weather-panel")).toBeInTheDocument();
    expect(screen.getByTestId("today-header-main-grid").className).toContain(
      "md:grid-cols-[minmax(0,1fr)_auto]",
    );
  });

  it("renders quick navigation entries and keeps day-segment state in sync", () => {
    const { rerender } = render(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={buildWeatherWeekOk()}
        selectedDateISO="2026-02-18"
        currentSegmentId="morning"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
      />,
    );

    const quickNav = screen.getByTestId("today-header-quick-nav");
    expect(quickNav).toHaveAttribute("data-active-bucket", "morning");
    expect(within(quickNav).getByRole("link", { name: "Aujourd'hui" })).toHaveAttribute("href", "/child");
    expect(within(quickNav).getByRole("link", { name: "Aujourd'hui" })).toHaveAttribute("aria-current", "page");
    expect(within(quickNav).getByRole("link", { name: "Check-lists" })).toHaveAttribute("href", "/child/checklists");
    expect(within(quickNav).getByRole("link", { name: "Recompenses" })).toHaveAttribute("href", "/child/missions");
    expect(within(quickNav).getByRole("link", { name: "Mes reussites" })).toHaveAttribute("href", "/child/achievements");
    expect(within(quickNav).queryByRole("link", { name: "Outils" })).not.toBeInTheDocument();

    rerender(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={buildWeatherWeekOk()}
        selectedDateISO="2026-02-18"
        currentSegmentId="evening"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
      />,
    );

    expect(screen.getByTestId("today-header-quick-nav")).toHaveAttribute("data-active-bucket", "evening");
  });

  it("renders degraded mode quietly with now-only weather hero", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={buildWeatherWeekDegraded()}
        selectedDateISO="2026-02-18"
        currentSegmentId="morning"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
      />,
    );

    const weatherPanel = screen.getByTestId("weather-panel");
    expect(weatherPanel).toHaveAttribute("data-weather-state", "degraded");
    expect(screen.queryByTestId("weather-sun-cycle")).not.toBeInTheDocument();
    expect(screen.queryByText(/indisponible/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/indisponibles/i)).not.toBeInTheDocument();
    expect(weatherPanel.textContent).not.toMatch(/\\u[0-9a-f]{4}/i);
    expect(weatherPanel).toHaveTextContent(/Maintenant/i);
    expect(weatherPanel).toHaveTextContent(/8/);
  });

  it("renders fallback mode quietly without sun-cycle or warning banner", () => {
    const week = createFallbackWeatherWeekUI({
      timezone: "Europe/Zurich",
      selectedDateISO: "2026-02-18",
    });

    render(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={week}
        selectedDateISO="2026-02-18"
        currentSegmentId="morning"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
      />,
    );

    const weatherPanel = screen.getByTestId("weather-panel");
    expect(weatherPanel).toHaveAttribute("data-weather-state", "fallback");
    expect(screen.queryByTestId("weather-sun-cycle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("weather-min-max-row")).not.toBeInTheDocument();
    expect(screen.queryByText(/indisponible/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/indisponibles/i)).not.toBeInTheDocument();
  });

  it("forwards day selection via onSelectDay", () => {
    const onSelectDay = vi.fn();

    render(
      <TodayHeader
        date={new Date("2026-02-18T10:20:00+01:00")}
        timezone="Europe/Zurich"
        weatherWeek={buildWeatherWeekOk()}
        selectedDateISO="2026-02-18"
        currentSegmentId="morning"
        segments={SEGMENTS}
        weekStartDate={new Date(2026, 1, 16)}
        onSelectDay={onSelectDay}
      />,
    );

    fireEvent.click(within(screen.getByTestId("weekday-cell-mardi")).getByRole("button"));
    expect(onSelectDay).toHaveBeenCalledTimes(1);

    const selectedDate = onSelectDay.mock.calls[0]?.[0] as Date;
    expect(selectedDate).toBeInstanceOf(Date);
    expect(selectedDate.getDate()).toBe(17);
  });
});
