import type { Meta, StoryObj } from "@storybook/react";
import { NextUpBanner } from "@/components/timeline/next-up-banner";

const meta = {
  title: "Timeline/NextUpBanner",
  component: NextUpBanner,
  args: {
    currentTask: {
      title: "Petit dejeuner",
      icon: "🧩",
      endTime: "08:00",
    },
    nextTask: {
      title: "Ecole",
      icon: "📚",
      startTime: "08:10",
    },
  },
} satisfies Meta<typeof NextUpBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AvecMaintenantEtEnsuite: Story = {};

export const SeulementEnsuite: Story = {
  args: {
    currentTask: null,
  },
};

export const AucuneTache: Story = {
  args: {
    currentTask: null,
    nextTask: null,
  },
};
