import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "@/components/ds";

const meta = {
  title: "DS/EtatVide",
  component: EmptyState,
  args: {
    title: "Aucune tache planifiee",
    description: "Ajoutez une routine pour commencer la journee plus sereinement.",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const AvecAction: Story = {
  args: {
    icon: "🧩",
    action: {
      label: "Ajouter une tache",
      onClick: () => undefined,
    },
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
