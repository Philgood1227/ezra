import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NowCursor } from "@/components/timeline/now-cursor";

describe("NowCursor", () => {
  it("rend le label Maintenant et se positionne sur l'axe", () => {
    render(
      <div className="relative">
        <NowCursor
          rangeStartMinutes={7 * 60}
          rangeEndMinutes={10 * 60}
          timelineHeight={360}
          currentTime={new Date("2026-02-12T08:00:00")}
        />
      </div>,
    );

    expect(screen.getByText("Maintenant")).toBeInTheDocument();
    expect(screen.getByLabelText("Maintenant")).toHaveStyle({ top: "120px" });
  });
});
