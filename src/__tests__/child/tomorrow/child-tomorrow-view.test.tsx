import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildTomorrowView } from "@/components/child/tomorrow";
import type { TomorrowPreparationSummary } from "@/lib/api/checklists";
import { toggleChecklistInstanceItemAction } from "@/lib/actions/checklists";
import type { ChecklistInstanceSummary } from "@/lib/day-templates/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/actions/checklists", () => ({
  toggleChecklistInstanceItemAction: vi.fn(),
}));

vi.mock("@/components/ds/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/network", () => ({
  isOnline: () => true,
}));

vi.mock("@/lib/utils/haptic", () => ({
  haptic: vi.fn(),
}));

const toggleChecklistInstanceItemActionMock = vi.mocked(toggleChecklistInstanceItemAction);

function buildTomorrow(
  overrides: Partial<TomorrowPreparationSummary> = {},
): TomorrowPreparationSummary {
  return {
    date: new Date("2026-02-20T10:00:00+01:00"),
    dateKey: "2026-02-20",
    dayTypeLabel: "Ecole",
    firstTransitionLabel: "Depart a 08:15",
    keyMoments: [
      {
        id: "moment-1",
        startTime: "08:15",
        endTime: "08:45",
        timeLabel: "08:15 - 08:45",
        label: "Atelier sport",
        kind: "activity",
      },
      {
        id: "moment-2",
        startTime: "09:00",
        endTime: "10:00",
        timeLabel: "09:00 - 10:00",
        label: "Cours de francais",
        kind: "activity",
      },
      {
        id: "moment-3",
        startTime: "17:00",
        endTime: "17:45",
        timeLabel: "17:00 - 17:45",
        label: "Devoirs maths",
        kind: "mission",
      },
      {
        id: "moment-4",
        startTime: "18:00",
        endTime: "18:30",
        timeLabel: "18:00 - 18:30",
        label: "Lecture",
        kind: "mission",
      },
      {
        id: "moment-5",
        startTime: "18:45",
        endTime: "19:30",
        timeLabel: "18:45 - 19:30",
        label: "Jeu calme",
        kind: "leisure",
      },
      {
        id: "moment-6",
        startTime: "20:00",
        endTime: "20:30",
        timeLabel: "20:00 - 20:30",
        label: "Moment non affiche",
        kind: "leisure",
      },
    ],
    ...overrides,
  };
}

function buildChecklistInstances(
  overrides: Partial<ChecklistInstanceSummary>[] = [],
): ChecklistInstanceSummary[] {
  const base: ChecklistInstanceSummary[] = [
    {
      id: "instance-1",
      familyId: "family-1",
      childProfileId: "child-1",
      diaryEntryId: null,
      type: "quotidien",
      label: "Sac d'ecole",
      date: "2026-02-20",
      createdAt: "2026-02-19T12:00:00.000Z",
      items: [
        {
          id: "item-1",
          checklistInstanceId: "instance-1",
          label: "Cahier de maths",
          isChecked: false,
          sortOrder: 0,
        },
      ],
    },
  ];

  if (overrides.length === 0) {
    return base;
  }

  const fallback = base[0];
  if (!fallback) {
    return [];
  }

  return overrides.map((entry, index) => ({
    ...fallback,
    id: entry.id ?? `instance-${index + 1}`,
    items: entry.items ?? fallback.items,
    ...entry,
  }));
}

describe("ChildTomorrowView", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    searchParams = new URLSearchParams();
    toggleChecklistInstanceItemActionMock.mockReset();
    toggleChecklistInstanceItemActionMock.mockResolvedValue({
      success: true,
      data: {
        checklistInstanceId: "instance-1",
        isChecked: true,
      },
    });
  });

  it("renders scheduled key moments, includes mission, and limits to 5 items", () => {
    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow()}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    expect(screen.getByRole("heading", { name: "DEMAIN" })).toBeInTheDocument();
    expect(screen.getByText("Ecole")).toBeInTheDocument();
    expect(screen.getByText("Depart a 08:15")).toBeInTheDocument();

    const list = screen.getByTestId("tomorrow-key-moments-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Devoirs maths")).toBeInTheDocument();
    expect(screen.getByText("17:00 - 17:45")).toBeInTheDocument();
    expect(screen.queryByText("Moment non affiche")).not.toBeInTheDocument();
  });

  it("keeps an early scheduled mission visible when key moments exceed 5", () => {
    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow({
          keyMoments: [
            {
              id: "mission-early",
              startTime: "07:15",
              endTime: "07:45",
              timeLabel: "07:15 - 07:45",
              label: "Mission parent dashboard",
              kind: "mission",
            },
            {
              id: "moment-1",
              startTime: "08:15",
              endTime: "08:45",
              timeLabel: "08:15 - 08:45",
              label: "Atelier sport",
              kind: "activity",
            },
            {
              id: "moment-2",
              startTime: "09:00",
              endTime: "10:00",
              timeLabel: "09:00 - 10:00",
              label: "Cours de francais",
              kind: "activity",
            },
            {
              id: "moment-3",
              startTime: "17:00",
              endTime: "17:45",
              timeLabel: "17:00 - 17:45",
              label: "Devoirs maths",
              kind: "mission",
            },
            {
              id: "moment-4",
              startTime: "18:00",
              endTime: "18:30",
              timeLabel: "18:00 - 18:30",
              label: "Lecture",
              kind: "mission",
            },
            {
              id: "moment-5",
              startTime: "20:30",
              endTime: "21:00",
              timeLabel: "20:30 - 21:00",
              label: "Mission tardive hors top 5",
              kind: "mission",
            },
          ],
        })}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    const list = screen.getByTestId("tomorrow-key-moments-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Mission parent dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Mission tardive hors top 5")).not.toBeInTheDocument();
  });

  it("uses premium two-column layout classes for md+", () => {
    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow()}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    const grid = screen.getByTestId("tomorrow-layout-grid");
    expect(grid.className).toContain("md:grid-cols-2");
  });

  it("shows calm empty state when tomorrow checklist has no item", () => {
    render(<ChildTomorrowView tomorrow={buildTomorrow()} checklistInstances={[]} />);

    expect(screen.getByText("Tout est pret pour demain")).toBeInTheDocument();
  });

  it("toggles checklist state and calls existing update action", async () => {
    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow()}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    const row = screen.getByRole("checkbox", { name: /Cahier de maths/i });
    fireEvent.click(row);

    expect(row).toHaveAttribute("aria-checked", "true");

    await waitFor(() => {
      expect(toggleChecklistInstanceItemActionMock).toHaveBeenCalledWith({
        itemId: "item-1",
        isChecked: true,
      });
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("final CTA acknowledges without navigation", () => {
    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow()}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "C'est pret" }));

    expect(screen.getByText("Parfait, preparation validee.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows tomorrow diagnostics only with debug query in non-production", () => {
    searchParams = new URLSearchParams("debug=1");

    render(
      <ChildTomorrowView
        tomorrow={buildTomorrow({
          debug: {
            source: "merged",
            timezone: "Europe/Zurich",
            todayDateKey: "2026-02-20",
            tomorrowDateKey: "2026-02-21",
            tomorrowDate: "2026-02-21",
            rangeStartIso: "2026-02-20T23:00:00.000Z",
            rangeEndIso: "2026-02-21T22:59:59.999Z",
            childId: "child-1",
            familyId: "family-1",
            resolvedDayType: "ecole",
            templateResolution: {
              resolvedTemplateId: "template-1",
              resolvedTemplateName: "Mercredi",
              resolvedTemplateReason: "first_template_with_tasks",
              weekdayTemplatesCount: 1,
              weekdayTemplates: [
                {
                  id: "template-1",
                  name: "Mercredi",
                  weekday: 3,
                  isDefault: true,
                  taskCount: 4,
                },
              ],
            },
            plannedInstancesCount: 2,
            templateTasksCount: 4,
            keyMomentsCount: 5,
            queries: {
              taskInstances: {
                table: "task_instances",
                criteria: {
                  familyId: "family-1",
                  childId: "child-1",
                  date: "2026-02-21",
                  excludedStatus: "ignore",
                  rangeStartIso: "2026-02-20T23:00:00.000Z",
                  rangeEndIso: "2026-02-21T22:59:59.999Z",
                  timezone: "Europe/Zurich",
                },
                count: 2,
                rows: [
                  {
                    id: "instance-7",
                    title: "Mission parent dashboard",
                    date: "2026-02-21",
                    startTime: "07:15",
                    assignedTo: "child-1",
                    itemKind: "mission",
                    status: "a_faire",
                    templateId: "template-1",
                  },
                ],
                error: null,
              },
              templateTasks: {
                table: "template_tasks",
                criteria: {
                  familyId: "family-1",
                  weekday: 3,
                  templateId: "template-1",
                  selectedTemplateReason: "first_template_with_tasks",
                  weekdayTemplateIds: ["template-1"],
                  includedTemplateIds: ["template-1"],
                },
                count: 4,
                rows: [],
                error: null,
              },
              scheduledTasks: {
                table: "scheduled_tasks",
                criteria: {
                  note: "no_separate_scheduled_tasks_table_queried",
                  familyId: "family-1",
                  childId: "child-1",
                  date: "2026-02-21",
                },
                count: 0,
                rows: [],
                error: null,
              },
            },
            rawPlannedRows: [],
            plannedTaskMoments: [],
            templateTaskMoments: [],
            selectedMoments: [],
            candidateItems: [
              {
                id: "instance-7",
                title: "Mission parent dashboard",
                startTime: "07:15",
                date: "2026-02-21",
                itemKind: "mission",
                status: "a_faire",
                source: "planned_instance",
                templateId: "template-1",
                assignedTo: "child-1",
              },
            ],
          },
        })}
        checklistInstances={buildChecklistInstances()}
      />,
    );

    expect(screen.getByTestId("tomorrow-debug-panel")).toBeInTheDocument();
    expect(screen.getByText(/task_instances=2 template_tasks=4 key_moments=5/)).toBeInTheDocument();
    expect(screen.getByText(/childId=child-1 familyId=family-1/)).toBeInTheDocument();
    expect(
      screen.getByText(/templateId=template-1 templateReason=first_template_with_tasks/),
    ).toBeInTheDocument();
    expect(screen.getByText("Devoirs maths")).toBeInTheDocument();
    expect(screen.getByText(/\[planned_instance\] instance-7/)).toBeInTheDocument();
  });
});
