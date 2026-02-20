import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarPanel } from "@/components/calendar/CalendarPanel";

describe("CalendarPanel", () => {
  it("combines date, season and month strip", () => {
    render(<CalendarPanel date={new Date(2026, 1, 10, 10, 0, 0)} />);

    expect(screen.getByText("Mardi 10 février 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Saison actuelle : Hiver")).toBeInTheDocument();
    expect(screen.getByText("février")).toHaveAttribute("aria-current", "true");
  });
});

