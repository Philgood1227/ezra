import type {
  AchievementCondition,
  AchievementSummary,
} from "@/lib/day-templates/types";

export interface AchievementMetricSnapshot {
  dailyPointsToday: number;
  completedStreakDays: number;
  pomodorosCompleted: number;
}

export interface AchievementSeed {
  code: string;
  label: string;
  description: string;
  icon: string;
  autoTrigger: boolean;
  condition: AchievementCondition;
}

export interface AchievementCategorySeed {
  code: string;
  label: string;
  colorKey: string;
  achievements: AchievementSeed[];
}

export const DEFAULT_ACHIEVEMENT_CATALOG: AchievementCategorySeed[] = [
  {
    code: "routine",
    label: "Routine",
    colorKey: "category-routine",
    achievements: [
      {
        code: "routine_3_jours",
        label: "Routine 3 jours",
        description: "Valide ta routine pendant 3 jours de suite.",
        icon: "🌟",
        autoTrigger: true,
        condition: { type: "tasks_completed_in_row", value: 3 },
      },
      {
        code: "routine_5_jours",
        label: "Routine 5 jours",
        description: "Enchaine 5 jours de routine complete.",
        icon: "🏅",
        autoTrigger: true,
        condition: { type: "tasks_completed_in_row", value: 5 },
      },
    ],
  },
  {
    code: "devoirs",
    label: "Devoirs",
    colorKey: "category-ecole",
    achievements: [
      {
        code: "points_30",
        label: "30 points en un jour",
        description: "Atteins 30 points sur la journee.",
        icon: "⭐",
        autoTrigger: true,
        condition: { type: "daily_points_at_least", value: 30 },
      },
      {
        code: "points_50",
        label: "50 points en un jour",
        description: "Atteins 50 points sur la journee.",
        icon: "🏆",
        autoTrigger: true,
        condition: { type: "daily_points_at_least", value: 50 },
      },
    ],
  },
  {
    code: "concentration",
    label: "Concentration",
    colorKey: "category-calme",
    achievements: [
      {
        code: "pomodoros_5",
        label: "5 pomodoros",
        description: "Termine 5 sessions de concentration.",
        icon: "🎯",
        autoTrigger: true,
        condition: { type: "pomodoros_completed", value: 5 },
      },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

export function parseAchievementCondition(value: unknown): AchievementCondition | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = typeof value.type === "string" ? value.type : "";
  const parsedValue = asInteger(value.value);
  if (parsedValue === null || parsedValue < 0) {
    return null;
  }

  if (type === "daily_points_at_least") {
    return { type, value: parsedValue };
  }

  if (type === "tasks_completed_in_row") {
    return { type, value: parsedValue };
  }

  if (type === "pomodoros_completed") {
    return { type, value: parsedValue };
  }

  return null;
}

export function isAchievementConditionSatisfied(
  condition: AchievementCondition,
  metrics: AchievementMetricSnapshot,
): boolean {
  switch (condition.type) {
    case "daily_points_at_least":
      return metrics.dailyPointsToday >= condition.value;
    case "tasks_completed_in_row":
      return metrics.completedStreakDays >= condition.value;
    case "pomodoros_completed":
      return metrics.pomodorosCompleted >= condition.value;
    default:
      return false;
  }
}

export function findUnlockableAchievements(input: {
  achievements: AchievementSummary[];
  alreadyUnlockedAchievementIds: Iterable<string>;
  metrics: AchievementMetricSnapshot;
}): AchievementSummary[] {
  const unlockedSet = new Set(input.alreadyUnlockedAchievementIds);

  return input.achievements.filter((achievement) => {
    if (!achievement.autoTrigger) {
      return false;
    }

    if (unlockedSet.has(achievement.id)) {
      return false;
    }

    return isAchievementConditionSatisfied(achievement.condition, input.metrics);
  });
}

export function countUnlockedAchievementsByCategory(input: {
  achievements: AchievementSummary[];
  unlockedAchievementIds: Iterable<string>;
}): Record<string, { unlocked: number; total: number }> {
  const unlockedSet = new Set(input.unlockedAchievementIds);

  return input.achievements.reduce<Record<string, { unlocked: number; total: number }>>(
    (accumulator, achievement) => {
      const bucket = accumulator[achievement.categoryId] ?? { unlocked: 0, total: 0 };
      bucket.total += 1;
      if (unlockedSet.has(achievement.id)) {
        bucket.unlocked += 1;
      }
      accumulator[achievement.categoryId] = bucket;
      return accumulator;
    },
    {},
  );
}

export function extractAchievementConditionHint(condition: AchievementCondition): string {
  if (condition.type === "daily_points_at_least") {
    return `Atteindre ${condition.value} points dans la journee.`;
  }

  if (condition.type === "tasks_completed_in_row") {
    return `Valider la routine ${condition.value} jours de suite.`;
  }

  return `Terminer ${condition.value} sessions de concentration.`;
}
