import type { Meta, StoryObj } from "@storybook/react";
import { WeeklyPointsWidget } from "@/components/parent/dashboard/weekly-points-widget";
import type { DashboardDaySummary } from "@/lib/domain/dashboard";

const daily: DashboardDaySummary[] = [
  { date: "2026-02-09", totalTasks: 6, completedTasks: 4, completionRate: 67, pointsTotal: 20, dominantEmotion: "content", dominantEmotionEmoji: ":)" },
  { date: "2026-02-10", totalTasks: 5, completedTasks: 5, completionRate: 100, pointsTotal: 28, dominantEmotion: "tres_content", dominantEmotionEmoji: ":D" },
  { date: "2026-02-11", totalTasks: 7, completedTasks: 4, completionRate: 57, pointsTotal: 18, dominantEmotion: "neutre", dominantEmotionEmoji: ":|" },
  { date: "2026-02-12", totalTasks: 5, completedTasks: 3, completionRate: 60, pointsTotal: 16, dominantEmotion: "content", dominantEmotionEmoji: ":)" },
  { date: "2026-02-13", totalTasks: 6, completedTasks: 5, completionRate: 83, pointsTotal: 24, dominantEmotion: "tres_content", dominantEmotionEmoji: ":D" },
  { date: "2026-02-14", totalTasks: 4, completedTasks: 2, completionRate: 50, pointsTotal: 12, dominantEmotion: "triste", dominantEmotionEmoji: ":(" },
  { date: "2026-02-15", totalTasks: 3, completedTasks: 1, completionRate: 33, pointsTotal: 8, dominantEmotion: "triste", dominantEmotionEmoji: ":(" },
];

const meta = {
  title: "Parent/Dashboard/Weekly Points Widget",
  component: WeeklyPointsWidget,
  args: {
    daily,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WeeklyPointsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
