import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthStrip } from "@/components/calendar/MonthStrip";
import { getNomsMois } from "@/lib/utils/time";

describe("MonthStrip", () => {
  it("renders all months and highlights the current month", () => {
    const monthNames = getNomsMois();
    render(<MonthStrip currentMonthIndex={1} />);

    for (const monthName of monthNames) {
      expect(screen.getByText(monthName)).toBeInTheDocument();
    }

    const currentMonth = screen.getByText(monthNames[1] ?? "fevrier");
    expect(currentMonth).toHaveAttribute("aria-current", "true");
    expect(currentMonth).toHaveClass("bg-brand-primary/16");
  });
});
