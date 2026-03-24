import { describe, expect, it } from "vitest";
import { getCurrentAndNextTasks, getNowCursorPositionPercent, getTaskPhase } from "@/lib/day-templates/timeline";
import type { TaskCategorySummary, TemplateTaskSummary } from "@/lib/day-templates/types";

const category: TaskCategorySummary = {
  id: "cat-1",
  familyId: "family-1",
  name: "Routine",
  icon: "routine",
  colorKey: "category-routine",
};

const tasks: TemplateTaskSummary[] = [
  {
    id: "task-1",
    templateId: "tpl-1",
    categoryId: "cat-1",
    title: "Petit dejeuner",
    description: null,
    startTime: "07:30",
    endTime: "08:00",
    sortOrder: 0,
    pointsBase: 2,
    category,
  },
  {
    id: "task-2",
    templateId: "tpl-1",
    categoryId: "cat-1",
    title: "Depart ecole",
    description: null,
    startTime: "08:10",
    endTime: "08:30",
    sortOrder: 1,
    pointsBase: 2,
    category,
  },
];

describe("timeline helpers", () => {
  it("calcule passe/en cours/futur", () => {
    expect(getTaskPhase(tasks[0]!, 7 * 60)).toEqual({ isPast: false, isCurrent: false, isFuture: true });
    expect(getTaskPhase(tasks[0]!, 7 * 60 + 45)).toEqual({
      isPast: false,
      isCurrent: true,
      isFuture: false,
    });
    expect(getTaskPhase(tasks[0]!, 8 * 60 + 1)).toEqual({
      isPast: true,
      isCurrent: false,
      isFuture: false,
    });
  });

  it("selectionne la tache en cours et la suivante", () => {
    const at745 = getCurrentAndNextTasks(tasks, 7 * 60 + 45);
    expect(at745.currentTask?.id).toBe("task-1");
    expect(at745.nextTask?.id).toBe("task-2");

    const at805 = getCurrentAndNextTasks(tasks, 8 * 60 + 5);
    expect(at805.currentTask).toBeNull();
    expect(at805.nextTask?.id).toBe("task-2");
  });

  it("calcule la position du curseur maintenant", () => {
    expect(getNowCursorPositionPercent(6 * 60, 6 * 60, 21 * 60)).toBe(0);
    expect(getNowCursorPositionPercent(21 * 60, 6 * 60, 21 * 60)).toBe(100);
    expect(getNowCursorPositionPercent(13 * 60 + 30, 6 * 60, 21 * 60)).toBeCloseTo(50);
  });
});

