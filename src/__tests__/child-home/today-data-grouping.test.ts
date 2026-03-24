import { describe, expect, it } from "vitest";
import { buildTimeBlocksForToday } from "@/components/child/today/today-data";
import type { ChildHomeTaskSummary } from "@/lib/api/child-home";
import type { DayTemplateBlockSummary } from "@/lib/day-templates/types";

function createTask(overrides: Partial<ChildHomeTaskSummary>): ChildHomeTaskSummary {
  return {
    id: overrides.id ?? "task-1",
    templateTaskId: overrides.templateTaskId ?? "template-task-1",
    title: overrides.title ?? "Mission",
    iconKey: overrides.iconKey ?? "default",
    colorKey: overrides.colorKey ?? "category-ecole",
    startTime: overrides.startTime ?? "16:45",
    endTime: overrides.endTime ?? "17:15",
    itemKind: overrides.itemKind ?? "mission",
    itemSubkind: overrides.itemSubkind ?? null,
    status: overrides.status ?? "a_faire",
    description: overrides.description ?? null,
    pointsBase: overrides.pointsBase ?? 3,
    pointsEarned: overrides.pointsEarned ?? 0,
    recommendedChildTimeBlockId: overrides.recommendedChildTimeBlockId ?? "home",
  };
}

describe("today-data grouping", () => {
  it("groups parent blocks and tasks into child time blocks", () => {
    const dayBlocks: DayTemplateBlockSummary[] = [
      {
        id: "block-school-am",
        dayTemplateId: "template-1",
        blockType: "school",
        label: "Ecole",
        startTime: "08:00",
        endTime: "11:00",
        sortOrder: 0,
        childTimeBlockId: "morning",
      },
      {
        id: "block-school-pm",
        dayTemplateId: "template-1",
        blockType: "school",
        label: "Ecole",
        startTime: "13:30",
        endTime: "16:00",
        sortOrder: 1,
        childTimeBlockId: "afternoon",
      },
    ];

    const tasks: ChildHomeTaskSummary[] = [
      createTask({
        id: "task-maths",
        title: "Ceci est ta mission en Maths",
        startTime: "16:45",
        endTime: "17:15",
        itemKind: "mission",
        recommendedChildTimeBlockId: "home",
      }),
      createTask({
        id: "task-chorale",
        title: "Chorale",
        startTime: "14:30",
        endTime: "15:00",
        itemKind: "activity",
        recommendedChildTimeBlockId: "afternoon",
      }),
    ];

    const timeline = buildTimeBlocksForToday({
      date: new Date("2026-02-18T10:00:00"),
      dayBlocks,
      todayTasks: tasks,
    });

    const morning = timeline.blocks.find((block) => block.id === "morning");
    const afternoon = timeline.blocks.find((block) => block.id === "afternoon");
    const home = timeline.blocks.find((block) => block.id === "home");

    expect(morning?.activities.some((activity) => activity.label === "Ecole")).toBe(true);
    expect(afternoon?.activities.some((activity) => activity.label === "Chorale")).toBe(true);
    expect(home?.activities.some((activity) => activity.label === "Ceci est ta mission en Maths")).toBe(true);
  });

  it("maps noon and home recommendations to weekend afternoon block", () => {
    const weekendTimeline = buildTimeBlocksForToday({
      date: new Date("2026-02-22T10:00:00"),
      dayBlocks: [],
      todayTasks: [
        createTask({
          id: "task-noon",
          title: "Mission midi",
          recommendedChildTimeBlockId: "noon",
          startTime: "12:00",
          endTime: "12:30",
        }),
        createTask({
          id: "task-home",
          title: "Mission retour maison",
          recommendedChildTimeBlockId: "home",
          startTime: "17:00",
          endTime: "17:20",
        }),
      ],
    });

    const afternoon = weekendTimeline.blocks.find((block) => block.id === "afternoon");
    expect(afternoon?.activities.some((activity) => activity.label === "Mission midi")).toBe(true);
    expect(afternoon?.activities.some((activity) => activity.label === "Mission retour maison")).toBe(true);
  });
});
