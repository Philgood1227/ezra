import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DayTimeline } from "@/components/timeline/day-timeline";
import type { DayContextSummary, DayTemplateBlockSummary, TaskInstanceSummary } from "@/lib/day-templates/types";

const tasks: TaskInstanceSummary[] = [
  {
    id: "instance-1",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "task-1",
    date: "2026-02-11",
    status: "a_faire",
    startTime: "08:00",
    endTime: "08:30",
    pointsBase: 2,
    pointsEarned: 0,
    title: "Petit dejeuner",
    description: null,
    sortOrder: 0,
    category: {
      id: "cat-1",
      familyId: "family-1",
      name: "Routine",
      icon: "🧩",
      colorKey: "category-routine",
    },
  },
  {
    id: "instance-2",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "task-2",
    date: "2026-02-11",
    status: "a_faire",
    startTime: "16:00",
    endTime: "16:30",
    pointsBase: 3,
    pointsEarned: 0,
    title: "Devoirs",
    description: "Maths",
    sortOrder: 1,
    category: {
      id: "cat-2",
      familyId: "family-1",
      name: "Ecole",
      icon: "📚",
      colorKey: "category-ecole",
    },
  },
];

const blocks: DayTemplateBlockSummary[] = [
  {
    id: "block-1",
    dayTemplateId: "template-1",
    blockType: "school",
    label: "Ecole matin",
    startTime: "08:30",
    endTime: "12:00",
    sortOrder: 0,
  },
];

const schoolContext: DayContextSummary = {
  period: "ecole",
  periodLabel: "Ecole",
  currentMoment: "matin",
  currentContextLabel: "Ecole",
  isInSchoolBlock: true,
  activeSchoolBlockEndTime: "12:00",
  nextVacationStartDate: null,
  nextVacationLabel: null,
  daysUntilNextVacation: null,
  hasSchoolPeriodsConfigured: false,
};

describe("DayTimeline", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("rend les taches et les plages ecole", () => {
    render(
      <DayTimeline
        tasks={tasks}
        blocks={blocks}
        dayContext={schoolContext}
        currentTime={new Date("2026-02-11T09:10:00")}
        onStatusChange={() => undefined}
        onFocusMode={() => undefined}
      />,
    );

    expect(screen.getByText("Ecole matin")).toBeInTheDocument();
    expect(screen.getByText("Maintenant: Ecole jusqu'a 12:00")).toBeInTheDocument();
    expect(screen.getAllByText("Petit dejeuner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Devoirs")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-detail-panel")).toBeInTheDocument();
  });

  it("affiche un panneau detail en mode compact et declenche l'action depuis ce panneau", () => {
    const onStatusChange = vi.fn();

    render(
      <DayTimeline
        tasks={tasks}
        blocks={blocks}
        dayContext={schoolContext}
        currentTime={new Date("2026-02-11T09:10:00")}
        compact
        onStatusChange={onStatusChange}
        onFocusMode={() => undefined}
      />,
    );

    const detailPanel = screen.getByTestId("timeline-detail-panel");
    expect(detailPanel).toBeInTheDocument();
    expect(within(detailPanel).getByText("Petit dejeuner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voir le detail de Devoirs" }));
    expect(screen.getByTestId("timeline-detail-panel")).toHaveTextContent("Devoirs");

    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    expect(onStatusChange).toHaveBeenCalledWith("instance-2", "en_cours");
  });
});
