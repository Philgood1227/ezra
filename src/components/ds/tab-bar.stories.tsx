import type { Meta, StoryObj } from "@storybook/react";
import { TabBar } from "@/components/ds";

const meta = {
  title: "DS/BarreOnglets",
  component: TabBar,
  args: {
    items: [
      { href: "/child", label: "Accueil", icon: "🏠" },
      { href: "/child/my-day", label: "Ma journee", icon: "🗓️", badgeCount: 2 },
      { href: "/child/knowledge", label: "Decouvertes", icon: "🧠" },
      { label: "Plus", icon: "➕", onClick: () => undefined, showBadgeDot: true },
    ],
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: (args) => (
    <div className="relative min-h-56 rounded-radius-card border border-border-default bg-bg-surface p-4">
      <p className="text-sm text-text-secondary">Apercu de la barre d&apos;onglets enfant.</p>
      <TabBar {...args} className="absolute inset-x-0 bottom-0" />
    </div>
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
