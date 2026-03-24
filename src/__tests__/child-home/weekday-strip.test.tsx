import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeekdayStrip } from "@/components/child/today/weekday-strip";
import type { DayUI } from "@/lib/weather/types";

describe("WeekdayStrip", () => {
  const weekStartDate = new Date(2026, 1, 16, 8, 0, 0); // Lundi 16 fevrier 2026
  const currentDate = new Date(2026, 1, 18, 10, 20, 0); // Mercredi 18 fevrier 2026

  const weatherDays: DayUI[] = [
    {
      dateISO: "2026-02-16",
      dowShort: "Lun",
      dayOfMonth: 16,
      minC: 1,
      maxC: 5,
      icon: "cloudy",
      summary: "Nuageux",
      popMaxPct: 10,
      precipLevel: "none",
      sun: null,
      buckets: [],
    },
  ];

  it("renders 7 french weekday cells with past/current/future states", () => {
    render(
      <WeekdayStrip
        currentDate={currentDate}
        weekStartDate={weekStartDate}
        timezone="Europe/Zurich"
        weatherDays={weatherDays}
      />,
    );

    const strip = screen.getByTestId("today-week-strip");
    expect(within(strip).getAllByRole("listitem")).toHaveLength(7);

    const mondayButton = within(screen.getByTestId("weekday-cell-lundi")).getByRole("button");
    const wednesdayButton = within(screen.getByTestId("weekday-cell-mercredi")).getByRole("button");
    const fridayButton = within(screen.getByTestId("weekday-cell-vendredi")).getByRole("button");
    const saturdayButton = within(screen.getByTestId("weekday-cell-samedi")).getByRole("button");

    expect(mondayButton).toHaveAttribute("data-state", "past");
    expect(wednesdayButton).toHaveAttribute("data-state", "current");
    expect(wednesdayButton).toHaveAttribute("aria-current", "date");
    expect(fridayButton).toHaveAttribute("data-state", "future");
    expect(saturdayButton).toHaveAttribute("data-weekend", "true");
    expect(screen.queryByTestId("weekday-weather-lundi")).not.toBeInTheDocument();
  });

  it("keeps weather badges hidden even when weather data is provided", () => {
    const weatherWithoutTemperature: DayUI[] = [
      {
        dateISO: "2026-02-16",
        dowShort: "Lun",
        dayOfMonth: 16,
        minC: null,
        maxC: null,
        icon: "cloudy",
        summary: null,
        popMaxPct: 0,
        precipLevel: "none",
        sun: null,
        buckets: [],
      },
    ];

    render(
      <WeekdayStrip
        currentDate={currentDate}
        weekStartDate={weekStartDate}
        timezone="Europe/Zurich"
        weatherDays={weatherWithoutTemperature}
      />,
    );

    expect(screen.queryByTestId("weekday-weather-lundi")).not.toBeInTheDocument();
  });

  it("calls onSelectDay with the selected date", () => {
    const onSelectDay = vi.fn();

    render(
      <WeekdayStrip
        currentDate={currentDate}
        weekStartDate={weekStartDate}
        timezone="Europe/Zurich"
        onSelectDay={onSelectDay}
      />,
    );

    fireEvent.click(within(screen.getByTestId("weekday-cell-dimanche")).getByRole("button"));
    expect(onSelectDay).toHaveBeenCalledTimes(1);

    const selectedDate = onSelectDay.mock.calls[0]?.[0] as Date;
    expect(selectedDate).toBeInstanceOf(Date);
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(1);
    expect(selectedDate.getDate()).toBe(22);
  });
});
