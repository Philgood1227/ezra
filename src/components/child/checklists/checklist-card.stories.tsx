import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ChecklistCard } from "@/components/child/checklists/checklist-card";
import type { ChecklistInstanceItemSummary } from "@/lib/day-templates/types";

function buildItems(checkedIds: string[] = []): ChecklistInstanceItemSummary[] {
  return [
    {
      id: "item-1",
      checklistInstanceId: "check-1",
      label: "Gourde remplie",
      isChecked: checkedIds.includes("item-1"),
      sortOrder: 0,
    },
    {
      id: "item-2",
      checklistInstanceId: "check-1",
      label: "Tenue de sport",
      isChecked: checkedIds.includes("item-2"),
      sortOrder: 1,
    },
    {
      id: "item-3",
      checklistInstanceId: "check-1",
      label: "Carte de bus",
      isChecked: checkedIds.includes("item-3"),
      sortOrder: 2,
    },
  ];
}

const meta = {
  title: "Child/Checklists/Carte Checklist",
  component: ChecklistCard,
  args: {
    label: "Sortie piscine",
    type: "piscine",
    items: buildItems(["item-1"]),
    progress: 33,
    onToggleItem: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChecklistCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function ChecklistCardInteractiveStory(
  args: React.ComponentProps<typeof ChecklistCard>,
): React.JSX.Element {
  const [items, setItems] = React.useState(buildItems(["item-1"]));
  return (
    <ChecklistCard
      {...args}
      items={items}
      progress={Math.round((items.filter((item) => item.isChecked).length / items.length) * 100)}
      onToggleItem={(itemId, checked) => {
        setItems((current) =>
          current.map((item) => (item.id === itemId ? { ...item, isChecked: checked } : item)),
        );
      }}
    />
  );
}

export const Defaut: Story = {};

export const ToutTermine: Story = {
  args: {
    items: buildItems(["item-1", "item-2", "item-3"]),
    progress: 100,
  },
};

export const Interactif: Story = {
  args: {
    onToggleItem: () => undefined,
  },
  render: (args) => <ChecklistCardInteractiveStory {...args} />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
