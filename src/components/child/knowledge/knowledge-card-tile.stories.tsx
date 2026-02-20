import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { KnowledgeCardTile } from "@/components/child/knowledge/knowledge-card-tile";

const meta = {
  title: "Child/Decouvertes/Tuile Fiche",
  component: KnowledgeCardTile,
  args: {
    title: "Addition a retenue",
    summary: "Une methode en 3 etapes pour ne pas se tromper.",
    difficulty: "CM1",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof KnowledgeCardTile>;

export default meta;
type Story = StoryObj<typeof meta>;

function KnowledgeCardTileInteractiveStory(
  args: React.ComponentProps<typeof KnowledgeCardTile>,
): React.JSX.Element {
  const [favorite, setFavorite] = React.useState(false);
  return (
    <KnowledgeCardTile
      {...args}
      isFavorite={favorite}
      onOpen={() => undefined}
      onFavoriteToggle={() => setFavorite((value) => !value)}
    />
  );
}

export const Defaut: Story = {
  args: {
    isFavorite: false,
    onFavoriteToggle: () => undefined,
    onOpen: () => undefined,
  },
};

export const Favori: Story = {
  args: {
    isFavorite: true,
    onFavoriteToggle: () => undefined,
    onOpen: () => undefined,
  },
};

export const Interactif: Story = {
  args: {
    isFavorite: false,
    onFavoriteToggle: () => undefined,
    onOpen: () => undefined,
  },
  render: (args) => <KnowledgeCardTileInteractiveStory {...args} />,
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  args: {
    isFavorite: true,
    onFavoriteToggle: () => undefined,
    onOpen: () => undefined,
  },
};
