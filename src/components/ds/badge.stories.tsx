import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ds";

const meta = {
  title: "DS/Badge",
  component: Badge,
  args: {
    children: "Statut",
    variant: "neutral",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "neutral",
        "success",
        "warning",
        "error",
        "info",
        "routine",
        "ecole",
        "repas",
        "sport",
        "loisir",
        "calme",
        "sommeil",
      ],
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Categories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="routine">Routine</Badge>
      <Badge variant="ecole">Ecole</Badge>
      <Badge variant="repas">Repas</Badge>
      <Badge variant="sport">Sport</Badge>
      <Badge variant="loisir">Loisir</Badge>
      <Badge variant="calme">Calme</Badge>
      <Badge variant="sommeil">Sommeil</Badge>
    </div>
  ),
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
