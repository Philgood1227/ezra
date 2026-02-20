import type { Meta, StoryObj } from "@storybook/react";
import { PomodoroView } from "@/components/timers/pomodoro-view";

const meta = {
  title: "Timers/PomodoroView",
  component: PomodoroView,
  args: {
    workMinutes: 10,
    breakMinutes: 5,
    cycles: 3,
  },
} satisfies Meta<typeof PomodoroView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standard: Story = {};

export const Court: Story = {
  args: {
    workMinutes: 5,
    breakMinutes: 3,
    cycles: 2,
  },
};
