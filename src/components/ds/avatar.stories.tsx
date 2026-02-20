import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "@/components/ds";

const meta = {
  title: "DS/Avatar",
  component: Avatar,
  args: {
    name: "Luca Martin",
    size: "md",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};

export const Tailles: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size="sm" name="Luca Martin" />
      <Avatar size="md" name="Luca Martin" />
      <Avatar size="lg" name="Luca Martin" ringColorClassName="ring-category-routine" />
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
