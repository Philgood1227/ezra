import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EmotionPicker } from "@/components/child/emotions/emotion-picker";
import type { EmotionValue } from "@/lib/day-templates/types";

const meta = {
  title: "Child/Emotions/Selecteur Emotion",
  component: EmotionPicker,
  args: {
    moment: "matin",
    isCompleted: false,
    isPending: false,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EmotionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function EmotionPickerInteractiveStory(
  args: React.ComponentProps<typeof EmotionPicker>,
): React.JSX.Element {
  const [emotion, setEmotion] = React.useState<EmotionValue | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  return (
    <EmotionPicker
      {...args}
      selectedEmotion={emotion}
      initialNote={note}
      onSelect={(nextEmotion, nextNote) => {
        setEmotion(nextEmotion);
        setNote(nextNote);
      }}
    />
  );
}

export const Defaut: Story = {
  args: {
    onSelect: () => undefined,
  },
};

export const DejaRenseigne: Story = {
  args: {
    selectedEmotion: "content",
    initialNote: "Je me sens bien aujourd'hui.",
    isCompleted: true,
    onSelect: () => undefined,
  },
};

export const Interactif: Story = {
  args: {
    onSelect: () => undefined,
  },
  render: (args) => <EmotionPickerInteractiveStory {...args} />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  args: {
    onSelect: () => undefined,
  },
};
