import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "@/components/ds";

const meta = {
  title: "DS/Selecteur",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <Select defaultValue="matin">
      <option value="matin">Matin</option>
      <option value="apres-midi">Apres-midi</option>
      <option value="soir">Soir</option>
    </Select>
  ),
};

export const Erreur: Story = {
  render: () => (
    <Select aria-invalid errorMessage="Selection obligatoire.">
      <option value="">Choisir une option</option>
      <option value="1">Option 1</option>
    </Select>
  ),
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  render: Defaut.render!,
};
