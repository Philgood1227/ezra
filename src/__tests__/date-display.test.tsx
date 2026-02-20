import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DateDisplay } from "@/components/calendar/DateDisplay";

describe("DateDisplay", () => {
  it("renders a french formatted date", () => {
    render(<DateDisplay date={new Date(2026, 1, 10, 9, 30, 0)} />);

    expect(screen.getByText("Mardi 10 février 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Date du jour : Mardi 10 février 2026")).toBeInTheDocument();
  });
});

