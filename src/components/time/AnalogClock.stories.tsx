import type { Meta, StoryObj } from "@storybook/react";
import { AnalogClock } from "@/components/time/AnalogClock";

const meta = {
  title: "Temps/AnalogClock",
  component: AnalogClock,
  args: {
    date: new Date(2026, 1, 10, 16, 37, 12),
    showSeconds: true,
  },
  argTypes: {
    showSeconds: {
      control: "boolean",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AnalogClock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApresMidi: Story = {};

export const Matin: Story = {
  args: {
    date: new Date(2026, 1, 10, 9, 15, 22),
  },
};

export const Nuit: Story = {
  args: {
    date: new Date(2026, 1, 10, 22, 48, 40),
  },
};

