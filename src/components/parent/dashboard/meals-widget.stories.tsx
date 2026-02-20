import type { Meta, StoryObj } from "@storybook/react";
import { MealsWidget } from "@/components/parent/dashboard/meals-widget";

const meta = {
  title: "Parent/Dashboard/Meals Widget",
  component: MealsWidget,
  args: {
    mealsCount: 14,
    ratedMealsCount: 9,
    favoriteMealsCount: 4,
    bofStreak: 0,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MealsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AlertBof: Story = {
  args: {
    mealsCount: 12,
    ratedMealsCount: 10,
    favoriteMealsCount: 1,
    bofStreak: 3,
  },
};

export const Dark: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
