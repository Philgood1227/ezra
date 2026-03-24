import type { Meta, StoryObj } from "@storybook/react";
import { DayTimeline } from "@/components/timeline/day-timeline";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";

const sampleTasks: TaskInstanceSummary[] = [
  {
    id: "i1",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "task-1",
    date: "2026-02-11",
    status: "a_faire",
    title: "Petit dejeuner",
    description: null,
    startTime: "07:30",
    endTime: "08:00",
    sortOrder: 0,
    pointsBase: 2,
    pointsEarned: 0,
    category: {
      id: "cat-1",
      familyId: "family-1",
      name: "Routine",
      icon: "routine",
      colorKey: "category-routine",
    },
  },
  {
    id: "i2",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "task-2",
    date: "2026-02-11",
    status: "en_cours",
    title: "Ecole",
    description: "Matin a l'ecole",
    startTime: "08:10",
    endTime: "12:00",
    sortOrder: 1,
    pointsBase: 3,
    pointsEarned: 0,
    category: {
      id: "cat-2",
      familyId: "family-1",
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
    },
  },
  {
    id: "i3",
    familyId: "family-1",
    childProfileId: "child-1",
    templateTaskId: "task-3",
    date: "2026-02-11",
    status: "a_faire",
    title: "Repas",
    description: null,
    startTime: "12:15",
    endTime: "13:00",
    sortOrder: 2,
    pointsBase: 2,
    pointsEarned: 0,
    category: {
      id: "cat-3",
      familyId: "family-1",
      name: "Repas",
      icon: "meal",
      colorKey: "category-repas",
    },
  },
];

const meta = {
  title: "Timeline/DayTimeline",
  component: DayTimeline,
  args: {
    tasks: sampleTasks,
    currentTime: new Date(2026, 1, 11, 8, 30, 0),
    onStatusChange: () => undefined,
    onFocusMode: () => undefined,
  },
} satisfies Meta<typeof DayTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matin: Story = {};

export const Soir: Story = {
  args: {
    currentTime: new Date(2026, 1, 11, 22, 0, 0),
  },
};

