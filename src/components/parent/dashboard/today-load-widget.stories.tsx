import type { Meta, StoryObj } from "@storybook/react";
import { TodayLoadWidget } from "@/components/parent/dashboard/today-load-widget";

const meta = {
  title: "Parent/Dashboard/Today Load Widget",
  component: TodayLoadWidget,
  args: {
    score: 3,
    label: "Aujourd'hui : journee moyenne.",
    assignments: [
      { key: "child", label: "Enfant", count: 4 },
      { key: "parent", label: "Parent Demo", count: 2 },
    ],
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TodayLoadWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowLoad: Story = {
  args: {
    score: 1,
    label: "Aujourd'hui : journee plutot legere.",
    assignments: [{ key: "child", label: "Enfant", count: 1 }],
  },
};

export const HighLoad: Story = {
  args: {
    score: 5,
    label: "Aujourd'hui : journee tres chargee.",
    assignments: [
      { key: "child", label: "Enfant", count: 8 },
      { key: "parent", label: "Parent Demo", count: 5 },
    ],
  },
};

export const Dark: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
