import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FocusView } from "@/components/child/focus/focus-view";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
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

vi.mock("@/lib/utils/haptic", () => ({
  haptic: vi.fn(),
}));

vi.mock("@/lib/utils/network", () => ({
  isOnline: () => true,
}));

function buildInstance(): TaskInstanceSummary {
  return {
    id: "task-1",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "template-task-1",
    itemKind: "mission",
    itemSubkind: "devoirs",
    date: "2026-02-15",
    status: "en_cours",
    startTime: "09:30",
    endTime: "10:30",
    pointsBase: 4,
    pointsEarned: 0,
    title: "Devoirs maths",
    description: null,
    sortOrder: 1,
    category: {
      id: "cat-1",
      familyId: "family-1",
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
    },
  };
}

describe("FocusView overlay mode", () => {
  it("freezes pomodoro when task pause is enabled", async () => {
    const { rerender } = render(
      <FocusView instance={buildInstance()} presentation="overlay" isTaskPaused={false} onClose={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "Retour" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pomodoro" }));
    fireEvent.click(screen.getByRole("button", { name: "Demarrer" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    rerender(<FocusView instance={buildInstance()} presentation="overlay" isTaskPaused onClose={vi.fn()} />);

    await waitFor(() => {
      const startButton = screen.getByRole("button", { name: "Demarrer" });
      expect(startButton).toBeDisabled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
