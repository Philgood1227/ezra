import { describe, expect, it } from "vitest";
import {
  findUnlockableAchievements,
  isAchievementConditionSatisfied,
  parseAchievementCondition,
} from "@/lib/domain/achievements";
import type { AchievementSummary } from "@/lib/day-templates/types";

describe("achievements domain", () => {
  it("evalue les conditions de points et de streak", () => {
    expect(
      isAchievementConditionSatisfied(
        { type: "daily_points_at_least", value: 30 },
        { dailyPointsToday: 32, completedStreakDays: 1, pomodorosCompleted: 0 },
      ),
    ).toBe(true);

    expect(
      isAchievementConditionSatisfied(
        { type: "tasks_completed_in_row", value: 3 },
        { dailyPointsToday: 10, completedStreakDays: 2, pomodorosCompleted: 0 },
      ),
    ).toBe(false);
  });

  it("debloque un succes une seule fois", () => {
    const achievements: AchievementSummary[] = [
      {
        id: "a1",
        categoryId: "c1",
        code: "points_30",
        label: "30 points",
        description: null,
        icon: "??",
        autoTrigger: true,
        condition: { type: "daily_points_at_least", value: 30 },
      },
    ];

    const unlockable = findUnlockableAchievements({
      achievements,
      alreadyUnlockedAchievementIds: ["a1"],
      metrics: { dailyPointsToday: 40, completedStreakDays: 0, pomodorosCompleted: 0 },
    });

    expect(unlockable).toHaveLength(0);
  });

  it("parse les conditions json valides", () => {
    expect(parseAchievementCondition({ type: "pomodoros_completed", value: 5 })).toEqual({
      type: "pomodoros_completed",
      value: 5,
    });

    expect(parseAchievementCondition({ type: "inconnu", value: 3 })).toBeNull();
  });
});
