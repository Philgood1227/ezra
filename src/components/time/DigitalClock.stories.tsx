import type { Meta, StoryObj } from "@storybook/react";
import { DigitalClock } from "@/components/time/DigitalClock";

const meta = {
  title: "Temps/DigitalClock",
  component: DigitalClock,
  args: {
    date: new Date(2026, 1, 10, 16, 37, 12),
    showSeconds: false,
  },
  argTypes: {
    showSeconds: {
      control: "boolean",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DigitalClock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApresMidi: Story = {};

export const Matin: Story = {
  args: {
    date: new Date(2026, 1, 10, 8, 12, 4),
  },
};

export const SoirAvecSecondes: Story = {
  args: {
    date: new Date(2026, 1, 10, 21, 5, 44),
    showSeconds: true,
  },
};

