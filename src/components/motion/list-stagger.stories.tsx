import type { Meta, StoryObj } from "@storybook/react";
import { StaggerContainer, StaggerItem } from "@/components/motion";

const meta = {
  title: "Motion/ListStagger",
  component: StaggerContainer,
  args: {
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StaggerContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <StaggerContainer className="space-y-2">
      {["Se lever", "Petit-dejeuner", "Preparation ecole", "Depart"].map((item) => (
        <StaggerItem key={item} className="rounded-radius-button border border-border-default bg-bg-surface px-4 py-3">
          <span className="text-sm text-text-primary">{item}</span>
        </StaggerItem>
      ))}
    </StaggerContainer>
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
