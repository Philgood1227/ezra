import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, ToastProvider, useToast } from "@/components/ds";

function ToastDemo(): React.JSX.Element {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success("Tache terminee !")}>Succes</Button>
      <Button variant="secondary" onClick={() => toast.info("Information en cours")}>
        Info
      </Button>
      <Button variant="ghost" onClick={() => toast.warning("Attention a la prochaine etape")}>
        Avertissement
      </Button>
      <Button variant="danger" onClick={() => toast.error("Erreur de sauvegarde")}>
        Erreur
      </Button>
    </div>
  );
}

const meta = {
  title: "DS/Toast",
  component: ToastProvider,
  args: {
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
};

export const ParentHautDroite: Story = {
  render: () => (
    <ToastProvider position="top-right">
      <ToastDemo />
    </ToastProvider>
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
