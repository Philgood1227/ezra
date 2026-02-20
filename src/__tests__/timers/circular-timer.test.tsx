import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CircularTimer } from "@/components/timers/circular-timer";

function CircularTimerHarness({ onFinished }: { onFinished: () => void }): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsRunning((current) => !current)}>
        Toggle
      </button>
      <CircularTimer durationSeconds={5} isRunning={isRunning} onFinished={onFinished} />
    </div>
  );
}

describe("CircularTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("demarre, pause et termine le minuteur", () => {
    vi.useFakeTimers();
    const onFinished = vi.fn();

    render(<CircularTimerHarness onFinished={onFinished} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("00:03")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("00:03")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
