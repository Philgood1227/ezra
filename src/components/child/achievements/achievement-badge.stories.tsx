import type { Meta, StoryObj } from "@storybook/react";
import { AchievementBadge } from "@/components/child/achievements/achievement-badge";

const meta = {
  title: "Child/Succes/Badge",
  component: AchievementBadge,
  args: {
    icon: "🌟",
    label: "Routine du matin",
    description: "Tu as termine toutes tes taches du matin.",
    colorKey: "category-routine",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AchievementBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Debloque: Story = {
  args: {
    isUnlocked: true,
    unlockedAt: "2026-02-13",
  },
};

export const Verrouille: Story = {
  args: {
    isUnlocked: false,
    hint: "Valide ta routine 3 jours de suite.",
  },
};

export const FraichementDebloque: Story = {
  args: {
    isUnlocked: true,
    unlockedAt: "2026-02-13",
    freshUnlocked: true,
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  args: {
    isUnlocked: true,
    unlockedAt: "2026-02-13",
  },
};
