import type { Meta, StoryObj } from "@storybook/react";
import { SchoolDiaryWidget } from "@/components/parent/dashboard/school-diary-widget";

const meta = {
  title: "Parent/Dashboard/School Diary Widget",
  component: SchoolDiaryWidget,
  args: {
    totalCount: 3,
    entries: [
      { id: "1", type: "devoir", date: "2026-02-13", title: "Exercices fractions" },
      { id: "2", type: "piscine", date: "2026-02-14", title: "Piscine vendredi" },
      { id: "3", type: "sortie", date: "2026-02-15", title: "Sortie mediatheque" },
    ],
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SchoolDiaryWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    totalCount: 0,
    entries: [],
  },
};

export const Dark: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
