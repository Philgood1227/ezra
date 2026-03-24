import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildDayTimelineView } from "@/components/child/my-day/child-day-timeline-view";
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
    description: "Revoir la lecon.",
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

describe("ChildDayTimelineView", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    updateTaskStatusActionMock.mockReset();
  });

  it("renders now/next/later sections", () => {
    render(
      <ChildDayTimelineView
        instances={[
          buildTask(),
          buildTask({
            id: "task-2",
            templateTaskId: "template-task-2",
            status: "a_faire",
            startTime: "11:00",
            endTime: "11:30",
            title: "Lecture",
            sortOrder: 2,
          }),
        ]}
        v2Enabled
      />,
    );

    expect(screen.getByRole("heading", { name: "Timeline", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Now" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Later" })).toBeInTheDocument();
    expect(screen.getByTestId("timeline-vertical-list")).toBeInTheDocument();
  });

  it("opens detail modal and updates task status from primary action", async () => {
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

    render(<ChildDayTimelineView instances={[buildTask()]} v2Enabled />);

    const detailButtons = screen.getAllByRole("button", { name: /Devoirs maths/i });
    const firstDetailButton = detailButtons[0];
    if (!firstDetailButton) {
      throw new Error("Timeline detail button not found.");
    }

    fireEvent.click(firstDetailButton);
    expect(screen.getByRole("dialog", { name: "Devoirs maths" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Marquer comme fait" }));

    await waitFor(() => {
      expect(updateTaskStatusActionMock).toHaveBeenCalledWith({ instanceId: "task-1", newStatus: "termine" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
