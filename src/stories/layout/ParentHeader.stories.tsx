import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ds";
import { ParentHeader } from "@/components/layout/parent-header";

const meta = {
  title: "Layout/ParentHeader",
  component: ParentHeader,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    title: "Tableau de bord parent",
    breadcrumb: [
      { label: "Tableau de bord", href: "/parent/dashboard" },
      { label: "Vue generale" },
    ],
    parentDisplayName: "Parent Demo",
    sidebarCollapsed: false,
    isLoggingOut: false,
    onOpenMobileSidebar: () => undefined,
    onToggleSidebarCollapse: () => undefined,
    onLogout: () => undefined,
  },
  render: (args) => (
    <div className="min-h-[220px] bg-bg-base">
      <ParentHeader {...args} />
    </div>
  ),
} satisfies Meta<typeof ParentHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    actions: (
      <Button size="sm" variant="secondary">
        Ajouter une entree
      </Button>
    ),
  },
};

export const Dark: Story = {
  globals: {
    theme: "dark",
  },
};

