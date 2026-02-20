import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ds";
import { AchievementUnlockCelebration } from "@/components/child/achievements/achievement-unlock-celebration";

const meta = {
  title: "Child/Succes/Celebration",
  component: AchievementUnlockCelebration,
  args: {
    open: true,
    icon: "🏅",
    label: "Champion de la semaine",
    onClose: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AchievementUnlockCelebration>;

export default meta;
type Story = StoryObj<typeof meta>;

function AchievementUnlockCelebrationInteractiveStory(
  args: React.ComponentProps<typeof AchievementUnlockCelebration>,
): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}>Afficher la celebration</Button>
      <AchievementUnlockCelebration {...args} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export const Defaut: Story = {};

export const Interactif: Story = {
  render: (args) => <AchievementUnlockCelebrationInteractiveStory {...args} />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
