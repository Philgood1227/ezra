import { describe, expect, it } from "vitest";
import { canOpenFocusForTask } from "@/lib/day-templates/focus";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";

function buildTask(overrides: Partial<TaskInstanceSummary> = {}): TaskInstanceSummary {
  return {
    id: "task-1",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "template-task-1",
    itemKind: "mission",
    itemSubkind: null,
    date: "2026-02-21",
    status: "a_faire",
    startTime: "10:00",
    endTime: "10:30",
    pointsBase: 3,
    pointsEarned: 0,
    title: "Task title",
    description: null,
    sortOrder: 1,
    category: {
      id: "category-1",
      familyId: "family-1",
      name: "Routine",
      icon: "routine",
      colorKey: "category-routine",
      defaultItemKind: "activity",
    },
    ...overrides,
  };
}

describe("canOpenFocusForTask", () => {
  it("returns true for mission itemKind", () => {
    const task = buildTask({ itemKind: "mission" });

    expect(canOpenFocusForTask(task)).toBe(true);
  });

  it("returns false for non-mission itemKind", () => {
    const task = buildTask({ itemKind: "leisure" });

    expect(canOpenFocusForTask(task)).toBe(false);
  });

  it("uses category.defaultItemKind when itemKind is missing", () => {
    const missionByDefault = buildTask({
      category: { ...buildTask().category, defaultItemKind: "mission" },
    });
    delete (missionByDefault as Partial<TaskInstanceSummary>).itemKind;

    const nonMissionByDefault = buildTask({
      category: { ...buildTask().category, defaultItemKind: "activity" },
    });
    delete (nonMissionByDefault as Partial<TaskInstanceSummary>).itemKind;

    expect(canOpenFocusForTask(missionByDefault)).toBe(true);
    expect(canOpenFocusForTask(nonMissionByDefault)).toBe(false);
  });

  it("throws when called with null/undefined at runtime", () => {
    expect(() => canOpenFocusForTask(undefined as unknown as TaskInstanceSummary)).toThrow();
    expect(() => canOpenFocusForTask(null as unknown as TaskInstanceSummary)).toThrow();
  });
});
