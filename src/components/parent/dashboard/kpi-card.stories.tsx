import type { Meta, StoryObj } from "@storybook/react";
import { KpiCard } from "@/components/parent/dashboard/kpi-card";

const meta = {
  title: "Parent/Dashboard/KPI Card",
  component: KpiCard,
  args: {
    label: "Taches completees cette semaine",
    value: "78%",
    detail: "22 taches validees",
    trend: "+2 jours complets",
    trendTone: "up",
    icon: <span aria-hidden="true">OK</span>,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NeutralTrend: Story = {
  args: {
    trend: "semaine irreguliere",
    trendTone: "neutral",
  },
};

export const Dark: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
