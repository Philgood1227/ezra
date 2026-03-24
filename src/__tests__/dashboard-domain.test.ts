import { describe, expect, it } from "vitest";
import { buildWeekDateKeys, computeDashboardWeekSummary } from "@/lib/domain/dashboard";
import type { DailyPointsSummary, EmotionLogSummary, MealWithRatingSummary, TaskInstanceSummary } from "@/lib/day-templates/types";

function makeTask(input: Partial<TaskInstanceSummary> & { id: string; date: string; status: TaskInstanceSummary["status"] }): TaskInstanceSummary {
  return {
    id: input.id,
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: `template-${input.id}`,
    date: input.date,
    status: input.status,
    startTime: "08:00",
    endTime: "08:30",
    pointsBase: 5,
    pointsEarned: input.status === "termine" ? 5 : 0,
    title: input.title ?? "Devoir maths",
    description: null,
    sortOrder: 0,
    assignedProfileId: input.assignedProfileId ?? null,
    assignedProfileDisplayName: input.assignedProfileDisplayName ?? null,
    assignedProfileRole: input.assignedProfileRole ?? null,
    category: {
      id: "category-1",
      familyId: "family-1",
      name: input.category?.name ?? "Ecole",
      icon: "school",
      colorKey: "category-ecole",
    },
  };
}

describe("dashboard domain", () => {
  it("calcule completion, points, humeur et charge", () => {
    const weekStart = "2026-02-09";
    const weekDateKeys = buildWeekDateKeys(weekStart);

    const tasks: TaskInstanceSummary[] = [
      makeTask({ id: "t1", date: "2026-02-09", status: "termine", assignedProfileId: "child-1", assignedProfileRole: "child" }),
      makeTask({ id: "t2", date: "2026-02-09", status: "a_faire", assignedProfileId: "parent-1", assignedProfileRole: "parent", assignedProfileDisplayName: "Papa" }),
      makeTask({ id: "t3", date: "2026-02-10", status: "ignore", title: "Routine soir" }),
    ];

    const dailyPoints: DailyPointsSummary[] = [
      { id: "p1", familyId: "family-1", childProfileId: "child-1", date: "2026-02-09", pointsTotal: 10 },
      { id: "p2", familyId: "family-1", childProfileId: "child-1", date: "2026-02-10", pointsTotal: 5 },
    ];

    const emotions: EmotionLogSummary[] = [
      {
        id: "e1",
        familyId: "family-1",
        childProfileId: "child-1",
        date: "2026-02-09",
        moment: "matin",
        emotion: "content",
        note: null,
        createdAt: "2026-02-09T08:00:00.000Z",
        updatedAt: "2026-02-09T08:00:00.000Z",
      },
      {
        id: "e2",
        familyId: "family-1",
        childProfileId: "child-1",
        date: "2026-02-09",
        moment: "soir",
        emotion: "neutre",
        note: null,
        createdAt: "2026-02-09T20:00:00.000Z",
        updatedAt: "2026-02-09T20:00:00.000Z",
      },
    ];

    const meals: MealWithRatingSummary[] = [
      {
        id: "m1",
        familyId: "family-1",
        childProfileId: "child-1",
        date: "2026-02-09",
        mealType: "diner",
        description: "Pates",
        preparedByLabel: "Papa",
        recipeId: null,
        recipeTitle: null,
        createdAt: "2026-02-09T18:00:00.000Z",
        updatedAt: "2026-02-09T18:00:00.000Z",
        ingredients: [],
        rating: {
          id: "r1",
          mealId: "m1",
          rating: 3,
          comment: null,
          createdAt: "2026-02-09T20:00:00.000Z",
          updatedAt: "2026-02-09T20:00:00.000Z",
        },
        isFavorite: true,
      },
    ];

    const summary = computeDashboardWeekSummary({
      weekStart,
      weekDateKeys,
      tasks,
      dailyPoints,
      emotions,
      meals,
      todayKey: "2026-02-09",
    });

    expect(summary.completionRateWeek).toBe(67);
    expect(summary.pointsTotalWeek).toBe(15);
    expect(summary.favoriteMeals[0]?.label).toBe("Pates");
    expect(summary.todayAssignmentShare.some((entry) => entry.label === "Enfant")).toBe(true);
    expect(summary.todayAssignmentShare.some((entry) => entry.label === "Papa")).toBe(true);
  });

  it("gere les cas sans donnees", () => {
    const weekStart = "2026-02-09";
    const weekDateKeys = buildWeekDateKeys(weekStart);
    const summary = computeDashboardWeekSummary({
      weekStart,
      weekDateKeys,
      tasks: [],
      dailyPoints: [],
      emotions: [],
      meals: [],
      todayKey: weekDateKeys[0] ?? weekStart,
    });

    expect(summary.completionRateWeek).toBe(0);
    expect(summary.pointsTotalWeek).toBe(0);
    expect(summary.averageMoodScore).toBeNull();
    expect(summary.favoriteMeals).toEqual([]);
  });
});
