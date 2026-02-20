import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ds";

const meta = {
  title: "DS/ChampTexte",
  component: Input,
  args: {
    placeholder: "Entrez une valeur",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Erreur: Story = {
  args: {
    value: "12",
    "aria-invalid": true,
    errorMessage: "Le format saisi est invalide.",
  },
};

export const Succes: Story = {
  args: {
    value: "Lucas",
    successMessage: "Parfait, la valeur est valide.",
  },
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
