import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChildDayViewLive } from "@/components/child/my-day/child-day-view-live";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ds/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useCurrentTime", () => ({
  useCurrentTime: () => ({
    date: new Date("2026-02-15T10:00:00+01:00"),
    hours24: 10,
    minutes: 0,
    seconds: 0,
  }),
}));

describe("ChildDayViewLive loading state", () => {
  it("renders loading skeleton without entering an update loop", () => {
    render(<ChildDayViewLive isLoading />);

    expect(screen.getByRole("heading", { name: /Ma journee/i })).toBeInTheDocument();
    expect(screen.getByText(/Journee type/i)).toBeInTheDocument();
  });

  it("uses V2 timeline context for next step and displays visual units", () => {
    render(
      <ChildDayViewLive
        v2Enabled
        templateBlocks={[
          {
            id: "block-morning-school",
            dayTemplateId: "tpl-1",
            blockType: "school",
            label: "Ecole",
            startTime: "08:00",
            endTime: "11:00",
            sortOrder: 10,
          },
          {
            id: "block-afternoon-school",
            dayTemplateId: "tpl-1",
            blockType: "school",
            label: "Ecole",
            startTime: "13:30",
            endTime: "16:00",
            sortOrder: 20,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /Repere du temps/i })).toBeInTheDocument();
    expect(screen.getByText(/1 unite = 15 min/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rien apres/i)).not.toBeInTheDocument();
    expect(screen.getByText(/13:30 - 16:00/i)).toBeInTheDocument();
  });
});
