import type { Meta, StoryObj } from "@storybook/react";
import { MealCard } from "@/components/child/meals/meal-card";

const meta = {
  title: "Child/Repas/Carte Repas",
  component: MealCard,
  args: {
    mealType: "dejeuner",
    description: "Poulet grille, riz et legumes",
    preparedByLabel: "Papa",
    rating: null,
    onRate: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MealCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NonNote: Story = {};

export const NoteBof: Story = {
  args: {
    rating: 1,
  },
};

export const NoteBon: Story = {
  args: {
    rating: 2,
  },
};

export const NoteAdore: Story = {
  args: {
    rating: 3,
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
