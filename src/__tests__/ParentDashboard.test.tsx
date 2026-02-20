import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParentDashboardView } from "@/features/dashboard/components";
import type { DashboardWeekSummary } from "@/lib/domain/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const summary: DashboardWeekSummary = {
  weekStart: "2026-02-09",
  weekEnd: "2026-02-15",
  completionRateWeek: 75,
  pointsTotalWeek: 42,
  mealsWeekCount: 6,
  ratedMealsWeekCount: 4,
  averageMoodScore: 0.6,
  moodMessage: "Semaine plutot equilibree",
  favoriteMeals: [
    { label: "Pates", count: 2 },
    { label: "Soupe", count: 1 },
  ],
  bofStreak: 0,
  todayLoadScore: 3,
  todayLoadLabel: "Aujourd'hui : journee moyenne.",
  todayAssignmentShare: [
    { key: "child", label: "Enfant", count: 3 },
    { key: "parent", label: "Papa", count: 1 },
  ],
  daily: [
    {
      date: "2026-02-09",
      totalTasks: 4,
      completedTasks: 3,
      completionRate: 75,
      pointsTotal: 10,
      dominantEmotion: "content",
      dominantEmotionEmoji: "🙂",
    },
    {
      date: "2026-02-10",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
    {
      date: "2026-02-11",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
    {
      date: "2026-02-12",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
    {
      date: "2026-02-13",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
    {
      date: "2026-02-14",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
    {
      date: "2026-02-15",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      pointsTotal: 0,
      dominantEmotion: null,
      dominantEmotionEmoji: null,
    },
  ],
};

describe("ParentDashboard", () => {
  it("affiche les indicateurs clefs", () => {
    render(
      <ParentDashboardView
        childName="Ezra"
        weekStart="2026-02-09"
        summary={summary}
        schoolDiaryCount={2}
        schoolDiaryUpcoming={[
          { id: "entry-1", type: "devoir", date: "2026-02-10", title: "Lecture" },
        ]}
      />,
    );

    expect(screen.getByText(/Taches completees cette semaine/i)).toBeInTheDocument();
    expect(screen.getByText(/Points cumules cette semaine/i)).toBeInTheDocument();
    expect(screen.getByText(/Humeur de la semaine/i)).toBeInTheDocument();
    expect(screen.getByText(/Carnet scolaire/i)).toBeInTheDocument();
    expect(screen.getByText(/2 entree\(s\) sur la semaine/i)).toBeInTheDocument();
  });
});

