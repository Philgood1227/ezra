import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, Modal } from "@/components/ds";

function ModalDemo(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Ouvrir la modale</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmer l'action"
        description="Cette action est irreversible."
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Souhaitez-vous continuer ?</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setOpen(false)}>Confirmer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const meta = {
  title: "DS/Modal",
  component: Modal,
  args: {
    open: false,
    onClose: () => undefined,
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => <ModalDemo />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  render: Defaut.render!,
};
