import type { JSX } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { ParentShell } from "@/components/layout/parent-shell";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";

declare global {
  interface Window {
    __EZRA_STORYBOOK_PATHNAME__?: string;
  }
}

const demoBadges: ParentNavBadges = {
  notifications: 3,
  schoolDiary: 1,
  checklists: 2,
  alarms: 0,
};

function withPathname(pathname: string) {
  function PathnameDecorator(Story: () => JSX.Element): JSX.Element {
    if (typeof window !== "undefined") {
      window.__EZRA_STORYBOOK_PATHNAME__ = pathname;
    }
    return <Story />;
  }

  PathnameDecorator.displayName = `PathnameDecorator(${pathname})`;
  return PathnameDecorator;
}

const meta = {
  title: "Layout/ParentShell",
  component: ParentShell,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    children: null,
    initialBadges: demoBadges,
    parentDisplayName: "Parent Demo",
    disableBadgeRefresh: true,
  },
  render: (args) => (
    <ParentShell {...args}>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Contenu parent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Cette story simule une page parent rendue dans le shell premium.
            </p>
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  ),
} satisfies Meta<typeof ParentShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashboard: Story = {
  decorators: [withPathname("/parent/dashboard")],
};

export const Organisation: Story = {
  decorators: [withPathname("/parent/day-templates")],
};

export const MobileDrawer: Story = {
  decorators: [withPathname("/parent/dashboard")],
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const DashboardDark: Story = {
  decorators: [withPathname("/parent/dashboard")],
  globals: {
    theme: "dark",
  },
};

