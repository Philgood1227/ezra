import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "@/components/ds";

const meta = {
  title: "DS/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => <Skeleton className="h-4 w-full" />,
};

export const CarteChargement: Story = {
  render: () => (
    <div className="max-w-md space-y-3 rounded-radius-card border border-border-default bg-bg-surface p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" count={3} />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" circle />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
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
