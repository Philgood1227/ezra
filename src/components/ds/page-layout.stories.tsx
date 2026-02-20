import type { Meta, StoryObj } from "@storybook/react";
import { Button, PageLayout } from "@/components/ds";

const meta = {
  title: "DS/MiseEnPage",
  component: PageLayout,
  args: {
    title: "Titre",
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <PageLayout
      title="Vue parent"
      subtitle="Mise en page commune, claire et stable pour reduire la charge cognitive."
      actions={<Button size="sm">Nouvelle action</Button>}
    >
      <div className="rounded-radius-card border border-border-default bg-bg-surface p-4 text-sm text-text-secondary">
        Zone de contenu principale.
      </div>
    </PageLayout>
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
