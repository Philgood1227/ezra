import type { Meta, StoryObj } from "@storybook/react";
import { PageTransition } from "@/components/motion";

const meta = {
  title: "Motion/PageTransition",
  component: PageTransition,
  args: {
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PageTransition>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <PageTransition className="rounded-radius-card border border-border-default bg-bg-surface p-5">
      <h3 className="text-lg font-semibold text-text-primary">Transition de page</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Le contenu apparait progressivement pour limiter les ruptures visuelles.
      </p>
    </PageTransition>
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
