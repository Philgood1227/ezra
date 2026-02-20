import type { Meta, StoryObj } from "@storybook/react";
import { ClockPanel } from "@/components/time/ClockPanel";

const meta = {
  title: "Temps/ClockPanel",
  component: ClockPanel,
  tags: ["autodocs"],
} satisfies Meta<typeof ClockPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TempsReel: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ClockPanel />
    </div>
  ),
};

