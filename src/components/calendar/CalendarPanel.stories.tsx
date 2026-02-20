import type { Meta, StoryObj } from "@storybook/react";
import { CalendarPanel } from "@/components/calendar/CalendarPanel";

interface CalendarPanelStoryProps {
  timestamp: number;
}

function CalendarPanelPreview({ timestamp }: CalendarPanelStoryProps): React.JSX.Element {
  return <CalendarPanel date={new Date(timestamp)} />;
}

const meta = {
  title: "Calendrier/CalendarPanel",
  component: CalendarPanelPreview,
  args: {
    timestamp: new Date(2026, 1, 10, 10, 0, 0).getTime(),
  },
  argTypes: {
    timestamp: {
      control: "date",
      name: "Date",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CalendarPanelPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hiver: Story = {};

export const Printemps: Story = {
  args: {
    timestamp: new Date(2026, 3, 18, 10, 0, 0).getTime(),
  },
};

export const Ete: Story = {
  args: {
    timestamp: new Date(2026, 6, 14, 10, 0, 0).getTime(),
  },
};

export const Automne: Story = {
  args: {
    timestamp: new Date(2026, 9, 2, 10, 0, 0).getTime(),
  },
};

