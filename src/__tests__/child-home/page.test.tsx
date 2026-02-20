import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChildHomeLive } from "@/components/child/child-home-live";
import type { ChildHomeData } from "@/lib/api/child-home";

const FIXED_DATE = new Date(2026, 1, 15, 10, 20, 0);
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/hooks/useCurrentTime", () => ({
  useCurrentTime: () => ({
    date: FIXED_DATE,
    hours24: FIXED_DATE.getHours(),
    minutes: FIXED_DATE.getMinutes(),
    seconds: FIXED_DATE.getSeconds(),
  }),
}));

function buildHomeData(overrides: Partial<ChildHomeData> = {}): ChildHomeData {
  return {
    childName: "Ezra",
    date: FIXED_DATE,
    currentTask: {
      title: "Naruto",
      icon: "\uD83C\uDFA8",
      colorKey: "category-ecole",
      startTime: "10:00",
      endTime: "10:45",
    },
    nextTask: {
      title: "Devoir de Maths",
      icon: "\uD83D\uDCDA",
      colorKey: "category-repas",
      startTime: "11:00",
      endTime: "11:20",
    },
    nowState: "active_task",
    dayPeriod: "ecole",
    dayPeriodLabel: "Ecole",
    daysUntilNextVacation: 5,
    nextVacationLabel: "Vacances d'hiver",
    nextVacationStartDate: "2026-02-19",
    hasSchoolPeriodsConfigured: true,
    currentMomentLabel: "Matin",
    currentContextLabel: "Temps a la maison",
    isInSchoolBlock: false,
    activeSchoolBlockEndTime: null,
    dayBlocks: [],
    pointsEarned: 7,
    pointsTarget: 12,
    tasksCompleted: 2,
    tasksTotal: 4,
    nextRewardLabel: "Soiree cinema",
    checklistTodayCount: 3,
    checklistTodayDone: 2,
    checklistTomorrowCount: 2,
    checklistTomorrowDone: 1,
    checklistUncheckedCount: 2,
    knowledgeCardsCount: 8,
    knowledgeSubjectsCount: 3,
    ...overrides,
  };
}

describe("Child Home cockpit", () => {
  it("renders exactly the 3 content blocks above nav", () => {
    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const layout = screen.getByTestId("child-home-layout");
    const sharedContainer = screen.getByTestId("child-home-shared-container");
    const todayHeader = within(sharedContainer).getByTestId("today-header");
    const nowCard = within(sharedContainer).getByTestId("child-home-now-card");
    const toolsCard = within(sharedContainer).getByTestId("tools-and-knowledge-card");

    expect(layout.className).toContain("max-w-full");
    expect(todayHeader).toBeInTheDocument();
    expect(nowCard).toBeInTheDocument();
    expect(toolsCard).toBeInTheDocument();
    expect(within(sharedContainer).getAllByTestId(/today-header|child-home-now-card|tools-and-knowledge-card/)).toHaveLength(3);
    expect(nowCard.className).not.toMatch(/max-w-\[/);
    expect(toolsCard.className).not.toMatch(/max-w-\[/);
  });

  it("keeps En ce moment as the central card with the primary CTA", () => {
    mockPush.mockClear();

    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByText("En ce moment")).toBeInTheDocument();
    expect(screen.getByText("Maintenant")).toBeInTheDocument();
    expect(screen.getByText("ENSUITE")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "Voir ma journee" });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);
    expect(mockPush).toHaveBeenCalledWith("/child/my-day");
  });

  it("does not render clock and long-term time concepts on Home", () => {
    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.queryByTestId("child-home-time-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clock-panel-trigger")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clock-overlay")).not.toBeInTheDocument();
    expect(screen.queryByText(/Lever du soleil/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coucher du soleil/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hiver|Printemps|Ete|Automne/i)).not.toBeInTheDocument();
  });
});
