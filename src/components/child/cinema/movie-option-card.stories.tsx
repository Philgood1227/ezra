import type { Meta, StoryObj } from "@storybook/react";
import { MovieOptionCard } from "@/components/child/cinema/movie-option-card";

const meta = {
  title: "Child/Cinema/Carte Film",
  component: MovieOptionCard,
  args: {
    title: "Le Voyage de Chihiro",
    platform: "Netflix",
    durationMinutes: 125,
    description: "Une aventure magique pleine de courage.",
    isSelected: false,
    isChosen: false,
    index: 0,
    onVote: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MovieOptionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NonVote: Story = {};

export const Vote: Story = {
  args: {
    isSelected: true,
  },
};

export const Choisi: Story = {
  args: {
    isChosen: true,
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
