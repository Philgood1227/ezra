import type { Meta, StoryObj } from "@storybook/react";
import { SubjectCard } from "@/components/child/knowledge/subject-card";

const meta = {
  title: "Child/Decouvertes/Carte Matiere",
  component: SubjectCard,
  args: {
    label: "Maths",
    code: "MATH",
    cardCount: 12,
    categoryCount: 3,
    selected: false,
    onSelect: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SubjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Selectionne: Story = {
  args: {
    selected: true,
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
