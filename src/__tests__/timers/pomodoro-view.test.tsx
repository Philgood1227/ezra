import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PomodoroView } from "@/components/timers/pomodoro-view";

describe("PomodoroView", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passe du travail a la pause puis au cycle suivant", () => {
    vi.useFakeTimers();
    const onMissionFinished = vi.fn();

    render(<PomodoroView workMinutes={1} breakMinutes={1} cycles={2} onMissionFinished={onMissionFinished} />);

    fireEvent.click(screen.getByRole("button", { name: "Demarrer" }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByRole("button", { name: "Passer la pause" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Passer la pause" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Terminer la mission" }));
    expect(onMissionFinished).toHaveBeenCalledTimes(1);
  });
});
