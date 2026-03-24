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
      iconKey: "leisure",
      colorKey: "category-ecole",
      startTime: "10:00",
      endTime: "10:45",
    },
    nextTask: {
      title: "Devoir de Maths",
      iconKey: "homework",
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
    todayTasks: [
      {
        id: "mission-principale-1",
        templateTaskId: "template-task-1",
        title: "Devoirs de maths",
        iconKey: "homework",
        colorKey: "category-ecole",
        startTime: "10:00",
        endTime: "10:20",
        itemKind: "mission",
        itemSubkind: "devoirs",
        status: "en_cours",
        description: null,
        pointsBase: 5,
        pointsEarned: 0,
        recommendedChildTimeBlockId: "morning",
      },
      {
        id: "mission-2",
        templateTaskId: "template-task-2",
        title: "Lecture",
        iconKey: "school",
        colorKey: "category-routine",
        startTime: "16:45",
        endTime: "17:00",
        itemKind: "mission",
        itemSubkind: "lecture",
        status: "a_faire",
        description: null,
        pointsBase: 3,
        pointsEarned: 0,
        recommendedChildTimeBlockId: "home",
      },
      {
        id: "leisure-1",
        templateTaskId: "template-task-3",
        title: "Jeu en famille",
        iconKey: "leisure",
        colorKey: "category-loisir",
        startTime: "18:30",
        endTime: "19:00",
        itemKind: "leisure",
        itemSubkind: "jeu",
        status: "a_faire",
        description: null,
        pointsBase: 0,
        pointsEarned: 0,
        recommendedChildTimeBlockId: "evening",
      },
    ],
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
  it("renders the Aujourd'hui cockpit blocks", () => {
    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const layout = screen.getByTestId("child-home-layout");
    expect(layout).toBeInTheDocument();
    expect(within(layout).getByTestId("today-header")).toBeInTheDocument();
    expect(within(layout).queryByText("Timeline de la journee")).not.toBeInTheDocument();
    expect(within(layout).getByText("Tes missions du jour")).toBeInTheDocument();
    expect(within(layout).getByText(/Tableau des quetes/i)).toBeInTheDocument();
    expect(within(layout).getByText("Ce qui sera chouette aujourd'hui ✨")).toBeInTheDocument();
  });

  it("navigates with date query param when a weekday is selected", () => {
    mockPush.mockClear();

    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    fireEvent.click(within(screen.getByTestId("weekday-cell-dimanche")).getByRole("button"));
    expect(mockPush).toHaveBeenCalledWith("/child?date=2026-02-15");
  });

  it("renders missions summary card content on home", () => {
    render(
      <ChildHomeLive
        data={buildHomeData()}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const missionsCard = screen.getByTestId("missions-summary-card");
    expect(within(missionsCard).getByTestId("missions-summary-subtitle")).toHaveTextContent(
      "0 quete terminee sur 2",
    );
    expect(within(missionsCard).getByTestId("missions-summary-category-homework")).toBeInTheDocument();
    expect(within(missionsCard).getByTestId("missions-summary-stars")).toHaveAttribute(
      "aria-label",
      "0 etoile gagnee sur 3",
    );
  });

  it("shows only mission types that exist for today", () => {
    render(
      <ChildHomeLive
        data={buildHomeData({
          todayTasks: [
            {
              id: "mission-homework",
              title: "Exercices de maths",
              iconKey: "homework",
              colorKey: "category-ecole",
              categoryName: "Devoirs",
              startTime: "09:00",
              endTime: "09:30",
              itemKind: "mission",
              itemSubkind: "devoirs",
              status: "termine",
              pointsBase: 5,
              pointsEarned: 5,
              recommendedChildTimeBlockId: "morning",
            },
            {
              id: "mission-revision",
              title: "Fiches histoire",
              iconKey: "knowledge",
              colorKey: "category-ecole",
              categoryName: "Revisions",
              startTime: "10:00",
              endTime: "10:30",
              itemKind: "mission",
              itemSubkind: "fiches",
              status: "a_faire",
              pointsBase: 4,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "morning",
            },
            {
              id: "mission-training",
              title: "Quiz flash",
              iconKey: "knowledge",
              colorKey: "category-ecole",
              categoryName: "Revisions",
              startTime: "11:00",
              endTime: "11:20",
              itemKind: "mission",
              itemSubkind: "entrainement",
              status: "a_faire",
              pointsBase: 3,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "morning",
            },
          ],
        })}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const missionsCard = screen.getByTestId("missions-summary-card");
    expect(within(missionsCard).getByTestId("missions-summary-category-homework")).toBeInTheDocument();
    expect(within(missionsCard).getByTestId("missions-summary-category-revision")).toBeInTheDocument();
    expect(within(missionsCard).getByTestId("missions-summary-category-training")).toBeInTheDocument();
    expect(within(missionsCard).getByTestId("missions-summary-stars")).toHaveAttribute(
      "aria-label",
      "1 etoile gagnee sur 3",
    );
  });

  it("hides mission types when none of the tracked mission types are present", () => {
    render(
      <ChildHomeLive
        data={buildHomeData({
          todayTasks: [
            {
              id: "mission-activity",
              title: "Atelier peinture",
              iconKey: "activity",
              colorKey: "category-sport",
              categoryName: "Activites",
              startTime: "14:00",
              endTime: "14:40",
              itemKind: "mission",
              itemSubkind: "atelier",
              status: "a_faire",
              pointsBase: 3,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "afternoon",
            },
          ],
        })}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const missionsCard = screen.getByTestId("missions-summary-card");
    expect(within(missionsCard).queryByTestId("missions-summary-category-homework")).not.toBeInTheDocument();
  });

  it("shows highlights from activity and leisure only", () => {
    render(
      <ChildHomeLive
        data={buildHomeData({
          todayTasks: [
            {
              id: "activity-1",
              title: "Match de foot a 17h30",
              iconKey: "sport",
              colorKey: "category-sport",
              categoryName: "Activites",
              startTime: "17:30",
              endTime: "18:00",
              itemKind: "activity",
              itemSubkind: "sport",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "evening",
            },
            {
              id: "leisure-1",
              title: "Soiree film en famille ce soir",
              iconKey: "leisure",
              colorKey: "category-loisir",
              categoryName: "Loisirs",
              startTime: "19:00",
              endTime: "20:00",
              itemKind: "leisure",
              itemSubkind: "film",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "evening",
            },
            {
              id: "mission-1",
              title: "Mission qui ne doit pas apparaitre",
              iconKey: "homework",
              colorKey: "category-ecole",
              categoryName: "Devoirs",
              startTime: "16:00",
              endTime: "16:30",
              itemKind: "mission",
              itemSubkind: "devoirs",
              status: "a_faire",
              pointsBase: 4,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "home",
            },
          ],
        })}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const highlightsCard = screen.getByTestId("daily-highlights-card");
    expect(within(highlightsCard).getByText("Match de foot a 17h30")).toBeInTheDocument();
    expect(within(highlightsCard).getByText("Soiree film en famille ce soir")).toBeInTheDocument();
    expect(within(highlightsCard).queryByText("Mission qui ne doit pas apparaitre")).not.toBeInTheDocument();
    expect(within(highlightsCard).queryByTestId("daily-highlights-empty")).not.toBeInTheDocument();
  });

  it("shows fallback fun message when there are no activity or leisure tasks", () => {
    render(
      <ChildHomeLive
        data={buildHomeData({
          todayTasks: [
            {
              id: "mission-only",
              title: "Devoir de francais",
              iconKey: "homework",
              colorKey: "category-ecole",
              categoryName: "Devoirs",
              startTime: "15:00",
              endTime: "15:30",
              itemKind: "mission",
              itemSubkind: "devoirs",
              status: "a_faire",
              pointsBase: 4,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "home",
            },
          ],
        })}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const highlightsCard = screen.getByTestId("daily-highlights-card");
    expect(within(highlightsCard).getByTestId("daily-highlights-empty")).toBeInTheDocument();
    expect(within(highlightsCard).getByText("C'est du fun aujourd'hui")).toBeInTheDocument();
  });

  it("keeps a leisure highlight visible when both activity and leisure exist", () => {
    render(
      <ChildHomeLive
        data={buildHomeData({
          todayTasks: [
            {
              id: "activity-1",
              title: "Atelier peinture",
              iconKey: "activity",
              colorKey: "category-sport",
              categoryName: "Activites",
              startTime: "09:00",
              endTime: "09:30",
              itemKind: "activity",
              itemSubkind: "atelier",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "morning",
            },
            {
              id: "activity-2",
              title: "Musique",
              iconKey: "activity",
              colorKey: "category-sport",
              categoryName: "Activites",
              startTime: "10:00",
              endTime: "10:30",
              itemKind: "activity",
              itemSubkind: "musique",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "morning",
            },
            {
              id: "activity-3",
              title: "Sport",
              iconKey: "activity",
              colorKey: "category-sport",
              categoryName: "Activites",
              startTime: "11:00",
              endTime: "11:30",
              itemKind: "activity",
              itemSubkind: "sport",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "afternoon",
            },
            {
              id: "legacy-leisure",
              title: "Temps calme lecture",
              iconKey: "leisure",
              colorKey: "category-loisir",
              categoryName: "Loisirs",
              startTime: "18:30",
              endTime: "19:00",
              itemKind: "mission",
              itemSubkind: "lecture",
              status: "a_faire",
              pointsBase: 0,
              pointsEarned: 0,
              recommendedChildTimeBlockId: "evening",
            },
          ],
        })}
        initialDateIso={FIXED_DATE.toISOString()}
        timezone="Europe/Zurich"
      />,
    );

    const highlightsCard = screen.getByTestId("daily-highlights-card");
    expect(within(highlightsCard).getByText("Temps calme lecture")).toBeInTheDocument();
  });

  it("keeps no legacy clock panel concepts on Home", () => {
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
    expect(screen.queryByText(/\b(Hiver|Printemps|Ete|Automne)\b/i)).not.toBeInTheDocument();
  });
});
