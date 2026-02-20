import type { Meta, StoryObj } from "@storybook/react";
import { ParentSidebar } from "@/components/layout/parent-sidebar";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";

const demoBadges: ParentNavBadges = {
  notifications: 3,
  schoolDiary: 2,
  checklists: 4,
  alarms: 1,
};

const meta = {
  title: "Layout/ParentSidebar",
  component: ParentSidebar,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    currentPath: "/parent/dashboard",
    badges: demoBadges,
    collapsed: false,
    mobileOpen: false,
    parentDisplayName: "Parent Demo",
    isLoggingOut: false,
    onCloseMobile: () => undefined,
    onToggleCollapsed: () => undefined,
    onLogout: () => undefined,
  },
  render: (args) => (
    <div className="min-h-screen bg-bg-base p-3 sm:p-6">
      <ParentSidebar {...args} />
    </div>
  ),
} satisfies Meta<typeof ParentSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

export const MobileDrawer: Story = {
  args: {
    mobileOpen: true,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const ExpandedDark: Story = {
  globals: {
    theme: "dark",
  },
};


