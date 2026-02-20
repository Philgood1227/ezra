import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ChecklistItemRow } from "@/components/child/checklists/checklist-item-row";

const meta = {
  title: "Child/Checklists/Ligne Checklist",
  component: ChecklistItemRow,
  args: {
    label: "Mettre la trousse dans le sac",
    isChecked: false,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChecklistItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

function ChecklistItemRowInteractiveStory(
  args: React.ComponentProps<typeof ChecklistItemRow>,
): React.JSX.Element {
  const [checked, setChecked] = React.useState(false);
  return (
    <ChecklistItemRow
      {...args}
      isChecked={checked}
      onToggle={() => setChecked((value) => !value)}
    />
  );
}

export const Defaut: Story = {
  args: {
    onToggle: () => undefined,
  },
};

export const Coche: Story = {
  args: {
    isChecked: true,
    onToggle: () => undefined,
  },
};

export const Interactif: Story = {
  args: {
    onToggle: () => undefined,
  },
  render: (args) => <ChecklistItemRowInteractiveStory {...args} />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  args: {
    onToggle: () => undefined,
  },
};
