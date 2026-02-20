import type { Meta, StoryObj } from "@storybook/react";
import { ThemeToggle } from "@/components/ds";

const meta = {
  title: "DS/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
