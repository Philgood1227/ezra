import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayHeader } from "@/components/child/home/today-header";

describe("TodayHeader", () => {
  it("renders Aujourd'hui + french weekday/day + month/year", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-15T10:20:00+01:00")}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByTestId("today-header")).toBeInTheDocument();
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("Dimanche 15")).toBeInTheDocument();
    expect(screen.getByText("F\u00E9vrier 2026")).toBeInTheDocument();
    expect(screen.getByTestId("today-hero-visual")).toBeInTheDocument();
  });

  it("renders 7-day strip and highlights current day", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-15T10:20:00+01:00")}
        timezone="Europe/Zurich"
      />,
    );

    const strip = screen.getByTestId("today-week-strip");
    const chips = within(strip).getAllByRole("listitem");
    expect(chips).toHaveLength(7);
    expect(screen.getByTestId("today-week-day-dimanche")).toHaveAttribute("aria-current", "date");
    expect(screen.getByTestId("today-week-day-lundi")).not.toHaveAttribute("aria-current");
  });

  it("does not render legacy day/night and sunrise/sunset labels", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-15T10:20:00+01:00")}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.queryByText("Jour")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuit")).not.toBeInTheDocument();
    expect(screen.queryByText(/Lever du soleil/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coucher du soleil/i)).not.toBeInTheDocument();
  });

  it("uses the hero background style and keeps the week strip visible", () => {
    render(
      <TodayHeader
        date={new Date("2026-02-15T10:20:00+01:00")}
        timezone="Europe/Zurich"
      />,
    );

    const header = screen.getByTestId("today-header");
    const weekStrip = screen.getByTestId("today-week-strip");
    const primaryDate = screen.getByTestId("today-primary-date");
    const weekDayChip = screen.getByTestId("today-week-day-lundi");

    expect(header.className).toContain("bg-hero-soft");
    expect(header.className).toContain("shadow-card");
    expect(header.className).toContain("overflow-hidden");
    expect(header.className).toContain("md:p-3.5");
    expect(header.innerHTML).toContain("md:grid-cols-[1fr_auto]");
    expect(primaryDate.className).toContain("md:text-[1.75rem]");
    expect(weekDayChip.className).toContain("h-touch-sm");
    expect(weekDayChip.className).toContain("w-touch-sm");
    expect(weekStrip).toBeVisible();
  });
});
