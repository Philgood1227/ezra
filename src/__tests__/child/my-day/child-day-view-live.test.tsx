import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildDayViewLive } from "@/components/child/my-day/child-day-view-live";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";
import { updateTaskStatusAction } from "@/lib/actions/tasks";

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

vi.mock("@/components/timeline/day-timeline", () => ({
  DayTimeline: () => <div data-testid="day-timeline" />,
}));

vi.mock("@/components/timeline/daily-progress-bar", () => ({
  DailyProgressBar: () => <div data-testid="daily-progress-bar" />,
}));

vi.mock("@/lib/hooks/useCurrentTime", () => ({
  useCurrentTime: () => ({
    date: new Date("2026-02-15T10:00:00+01:00"),
    hours24: 10,
    minutes: 0,
    seconds: 0,
  }),
}));

vi.mock("@/lib/actions/tasks", () => ({
  updateTaskStatusAction: vi.fn(),
}));

vi.mock("@/lib/utils/network", () => ({
  isOnline: () => true,
}));

vi.mock("@/lib/utils/haptic", () => ({
  haptic: vi.fn(),
}));

vi.mock("@/lib/utils/sounds", () => ({
  playSound: vi.fn(),
}));

const updateTaskStatusActionMock = vi.mocked(updateTaskStatusAction);

function buildTask(overrides: Partial<TaskInstanceSummary> = {}): TaskInstanceSummary {
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
    ...overrides,
  };
}

describe("ChildDayViewLive task card", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    updateTaskStatusActionMock.mockReset();
  });

  it("does not render the task card when there is no active task", () => {
    render(
      <ChildDayViewLive
        instances={[
          buildTask({
            id: "future-task",
            status: "a_faire",
            startTime: "11:00",
            endTime: "11:30",
            title: "Lecture",
          }),
        ]}
      />,
    );

    expect(screen.queryByTestId("my-day-active-task-card")).not.toBeInTheDocument();
    expect(screen.getByText("Maintenant")).toBeInTheDocument();
  });

  it("marks task as done without navigation and refreshes UI", async () => {
    updateTaskStatusActionMock.mockResolvedValue({
      success: true,
      data: {
        instanceId: "task-1",
        status: "termine",
        pointsEarnedTask: 4,
        pointsDelta: 4,
        dailyPointsTotal: 8,
        unlockedAchievementLabels: [],
      },
    });

    render(<ChildDayViewLive instances={[buildTask()]} />);

    const firstTaskCard = screen.getAllByTestId("my-day-active-task-card")[0];
    if (!firstTaskCard) {
      throw new Error("Task card not found.");
    }

    fireEvent.click(within(firstTaskCard).getByRole("button", { name: "Je termine" }));

    await waitFor(() => {
      expect(updateTaskStatusActionMock).toHaveBeenCalledWith({ instanceId: "task-1", newStatus: "termine" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("toggles paused state and updates task card UI", () => {
    render(<ChildDayViewLive instances={[buildTask()]} />);

    const firstTaskCard = screen.getAllByTestId("my-day-active-task-card")[0];
    if (!firstTaskCard) {
      throw new Error("Task card not found.");
    }

    fireEvent.click(within(firstTaskCard).getByRole("button", { name: "Pause" }));

    expect(within(firstTaskCard).getByText("En pause")).toBeInTheDocument();
    expect(within(firstTaskCard).getByRole("button", { name: "Reprendre" })).toBeInTheDocument();
    expect(firstTaskCard.className).toContain("opacity-80");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("opens Focus in an overlay and closes it without navigation", async () => {
    render(<ChildDayViewLive instances={[buildTask()]} />);

    const firstTaskCard = screen.getAllByTestId("my-day-active-task-card")[0];
    if (!firstTaskCard) {
      throw new Error("Task card not found.");
    }

    fireEvent.click(within(firstTaskCard).getByRole("button", { name: "Ouvrir le focus" }));

    const dialog = screen.getByRole("dialog", { name: "Focus" });
    expect(dialog).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Fermer le focus" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Focus" })).not.toBeInTheDocument();
    });
    expect(within(firstTaskCard).getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("uses deterministic metadata for Focus eligibility", () => {
    render(
      <ChildDayViewLive
        instances={[
          buildTask({
            itemKind: "leisure",
            itemSubkind: "devoirs",
            title: "Devoirs maths",
          }),
        ]}
      />,
    );

    const firstTaskCard = screen.getAllByTestId("my-day-active-task-card")[0];
    if (!firstTaskCard) {
      throw new Error("Task card not found.");
    }

    expect(within(firstTaskCard).queryByRole("button", { name: "Ouvrir le focus" })).not.toBeInTheDocument();
  });

  it("closes Focus overlay on Escape without navigation", async () => {
    render(<ChildDayViewLive instances={[buildTask()]} />);

    const firstTaskCard = screen.getAllByTestId("my-day-active-task-card")[0];
    if (!firstTaskCard) {
      throw new Error("Task card not found.");
    }

    fireEvent.click(within(firstTaskCard).getByRole("button", { name: "Ouvrir le focus" }));
    expect(screen.getByRole("dialog", { name: "Focus" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Focus" })).not.toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("opens timeline route when active card is tapped", async () => {
    render(<ChildDayViewLive instances={[buildTask()]} />);

    fireEvent.click(screen.getByTestId("my-day-active-task-card"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/child/my-day/timeline");
    });
  });
});
