import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ds";

const meta = {
  title: "DS/Bouton",
  component: Button,
  args: {
    children: "Enregistrer",
    variant: "primary",
    size: "md",
    disabled: false,
    loading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "ghost", "danger", "link"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primaire</Button>
      <Button variant="secondary">Secondaire</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Erreur</Button>
      <Button variant="link">Lien</Button>
    </div>
  ),
};

export const Etats: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button loading>Chargement</Button>
      <Button disabled>Desactive</Button>
      <Button size="lg">Action enfant</Button>
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
