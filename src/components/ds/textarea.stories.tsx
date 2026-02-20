import type { Meta, StoryObj } from "@storybook/react";
import { TextArea } from "@/components/ds";

const meta = {
  title: "DS/ZoneTexte",
  component: TextArea,
  args: {
    placeholder: "Ajoutez un commentaire...",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Etats: Story = {
  render: () => (
    <div className="space-y-4">
      <TextArea defaultValue="Tout va bien aujourd'hui." successMessage="Contenu valide." />
      <TextArea aria-invalid errorMessage="Le message est requis." />
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
