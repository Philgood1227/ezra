import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar } from "@/components/ds";

const meta = {
  title: "DS/BarreProgression",
  component: ProgressBar,
  args: {
    value: 65,
    showLabel: true,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="space-y-4">
      <ProgressBar value={35} variant="primary" showLabel />
      <ProgressBar value={60} variant="success" showLabel />
      <ProgressBar value={80} variant="warning" showLabel />
      <ProgressBar value={45} variant="accent-warm" showLabel />
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
