import { getAssignmentKind, getParentAssignmentLabel } from "@/lib/domain/assignments";
import { getDominantEmotion, getEmotionEmoji, getEmotionScore, getMoodSummaryMessage } from "@/lib/domain/emotion-logs";
import { computeTrailingBofStreak, isFavoriteMealRating } from "@/lib/domain/meals";
import type { DailyPointsSummary, EmotionLogSummary, MealWithRatingSummary, TaskInstanceSummary } from "@/lib/day-templates/types";

export interface DashboardDaySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  pointsTotal: number;
  dominantEmotion: EmotionLogSummary["emotion"] | null;
  dominantEmotionEmoji: string | null;
}

export interface DashboardFavoriteMeal {
  label: string;
  count: number;
}

export interface DashboardAssignmentShare {
  key: string;
  label: string;
  count: number;
}

export interface DashboardWeekSummary {
  weekStart: string;
  weekEnd: string;
  completionRateWeek: number;
  pointsTotalWeek: number;
  mealsWeekCount: number;
  ratedMealsWeekCount: number;
  averageMoodScore: number | null;
  moodMessage: string;
  favoriteMeals: DashboardFavoriteMeal[];
  bofStreak: number;
  todayLoadScore: number;
  todayLoadLabel: string;
  todayAssignmentShare: DashboardAssignmentShare[];
  daily: DashboardDaySummary[];
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function getWeekStartKey(referenceDate: Date): string {
  const copy = new Date(referenceDate);
  const day = copy.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diffToMonday);
  copy.setHours(0, 0, 0, 0);
  return toDateKey(copy);
}

export function shiftWeekStartKey(weekStartKey: string, offsetWeeks: number): string {
  const copy = fromDateKey(weekStartKey);
  copy.setDate(copy.getDate() + offsetWeeks * 7);
  return toDateKey(copy);
}

export function buildWeekDateKeys(weekStartKey: string): string[] {
  const start = fromDateKey(weekStartKey);
  return Array.from({ length: 7 }, (_, index) => {
    const copy = new Date(start);
    copy.setDate(start.getDate() + index);
    return toDateKey(copy);
  });
}

function isTaskCompleted(status: TaskInstanceSummary["status"]): boolean {
  return status === "termine" || status === "ignore";
}

function getLoadLabel(score: number): string {
  if (score <= 1) {
    return "Aujourd'hui : journee plutot legere.";
  }

  if (score <= 3) {
    return "Aujourd'hui : journee moyenne.";
  }

  if (score === 4) {
    return "Aujourd'hui : journee chargee.";
  }

  return "Aujourd'hui : journee tres chargee.";
}

function computeTodayLoadScore(tasks: TaskInstanceSummary[]): number {
  const totalWeight = tasks.reduce((sum, task) => {
    let weight = 1;
    const assignment = getAssignmentKind(task);
    if (assignment === "parent") {
      weight = 0.4;
    }

    const normalizedTitle = task.title
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normalizedCategory = task.category.name
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (
      normalizedTitle.includes("devoir") ||
      normalizedCategory.includes("ecole")
    ) {
      weight += 0.5;
    }

    return sum + weight;
  }, 0);

  return Math.max(0, Math.min(5, Math.round(totalWeight / 2)));
}

function computeAssignmentShare(tasks: TaskInstanceSummary[]): DashboardAssignmentShare[] {
  const counts = new Map<string, DashboardAssignmentShare>();

  tasks.forEach((task) => {
    const kind = getAssignmentKind(task);
    const key = kind === "famille" ? "famille" : task.assignedProfileId ?? kind;
    const label = getParentAssignmentLabel(task);
    const current = counts.get(key) ?? { key, label, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });

  return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"));
}

export function computeDashboardWeekSummary(input: {
  weekStart: string;
  weekDateKeys: string[];
  tasks: TaskInstanceSummary[];
  dailyPoints: DailyPointsSummary[];
  emotions: EmotionLogSummary[];
  meals: MealWithRatingSummary[];
  todayKey: string;
}): DashboardWeekSummary {
  const pointsByDate = new Map(input.dailyPoints.map((entry) => [entry.date, entry.pointsTotal]));
  const emotionsByDate = new Map<string, EmotionLogSummary[]>();
  input.emotions.forEach((log) => {
    const bucket = emotionsByDate.get(log.date) ?? [];
    bucket.push(log);
    emotionsByDate.set(log.date, bucket);
  });

  const tasksByDate = new Map<string, TaskInstanceSummary[]>();
  input.tasks.forEach((task) => {
    const bucket = tasksByDate.get(task.date) ?? [];
    bucket.push(task);
    tasksByDate.set(task.date, bucket);
  });

  const daily = input.weekDateKeys.map((date) => {
    const dayTasks = tasksByDate.get(date) ?? [];
    const completedTasks = dayTasks.filter((task) => isTaskCompleted(task.status)).length;
    const totalTasks = dayTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const dayEmotions = (emotionsByDate.get(date) ?? []).map((entry) => entry.emotion);
    const dominantEmotion = getDominantEmotion(dayEmotions);

    return {
      date,
      totalTasks,
      completedTasks,
      completionRate,
      pointsTotal: pointsByDate.get(date) ?? 0,
      dominantEmotion,
      dominantEmotionEmoji: dominantEmotion ? getEmotionEmoji(dominantEmotion) : null,
    };
  });

  const completedWeek = input.tasks.filter((task) => isTaskCompleted(task.status)).length;
  const completionRateWeek = input.tasks.length > 0 ? Math.round((completedWeek / input.tasks.length) * 100) : 0;
  const pointsTotalWeek = daily.reduce((sum, day) => sum + day.pointsTotal, 0);
  const moodScores = input.emotions.map((entry) => getEmotionScore(entry.emotion));
  const averageMoodScore =
    moodScores.length > 0 ? moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length : null;

  const favoriteCountByMeal = new Map<string, number>();
  input.meals.forEach((meal) => {
    if (!isFavoriteMealRating(meal.rating?.rating ?? null)) {
      return;
    }
    favoriteCountByMeal.set(meal.description, (favoriteCountByMeal.get(meal.description) ?? 0) + 1);
  });

  const favoriteMeals = [...favoriteCountByMeal.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"))
    .slice(0, 3);

  const ratingsChronological = input.meals
    .filter((meal) => meal.rating)
    .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt))
    .map((meal) => meal.rating?.rating ?? 0);
  const bofStreak = computeTrailingBofStreak(ratingsChronological);

  const todayTasks = tasksByDate.get(input.todayKey) ?? [];
  const todayLoadScore = computeTodayLoadScore(todayTasks);

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekDateKeys[input.weekDateKeys.length - 1] ?? input.weekStart,
    completionRateWeek,
    pointsTotalWeek,
    mealsWeekCount: input.meals.length,
    ratedMealsWeekCount: input.meals.filter((meal) => Boolean(meal.rating)).length,
    averageMoodScore,
    moodMessage: getMoodSummaryMessage(averageMoodScore),
    favoriteMeals,
    bofStreak,
    todayLoadScore,
    todayLoadLabel: getLoadLabel(todayLoadScore),
    todayAssignmentShare: computeAssignmentShare(todayTasks),
    daily,
  };
}
