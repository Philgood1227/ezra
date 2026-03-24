import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionsSummaryCard } from "@/components/missions/MissionsSummaryCard";
import type { MissionUI } from "@/components/missions/types";

function createMission(overrides: Partial<MissionUI> = {}): MissionUI {
  const mission: MissionUI = {
    id: overrides.id ?? `mission-${Math.random().toString(16).slice(2)}`,
    title: overrides.title ?? "Mission",
    iconKey: overrides.iconKey ?? "homework",
    colorKey: overrides.colorKey ?? "category-ecole",
    startTime: overrides.startTime ?? "16:00",
    endTime: overrides.endTime ?? "16:20",
    estimatedMinutes: overrides.estimatedMinutes ?? 20,
    points: overrides.points ?? 4,
    status: overrides.status ?? "todo",
    sourceStatus: overrides.sourceStatus ?? "a_faire",
    instructionsHtml: overrides.instructionsHtml ?? "<p>Consigne test</p>",
    helpLinks: overrides.helpLinks ?? [],
    recommendedBlockId: overrides.recommendedBlockId ?? "home",
    recommendedBlockLabel: overrides.recommendedBlockLabel ?? "Maison",
    itemSubkind: overrides.itemSubkind ?? null,
    categoryName: overrides.categoryName ?? "Devoirs",
    microSteps: overrides.microSteps ?? [],
  };

  if (overrides.missionCategory !== undefined) {
    mission.missionCategory = overrides.missionCategory;
  }

  return mission;
}

describe("MissionsSummaryCard", () => {
  it("renders dashboard categories and stars", () => {
    render(
      <MissionsSummaryCard
        missions={[
          createMission({ id: "m1", status: "done", points: 5, missionCategory: "homework" }),
          createMission({ id: "m2", status: "done", points: 5, missionCategory: "revision" }),
          createMission({ id: "m3", status: "todo", points: 5, missionCategory: "training" }),
          createMission({ id: "m4", status: "todo", points: 5, missionCategory: "revision" }),
          createMission({ id: "m5", status: "todo", points: 5, missionCategory: "homework" }),
        ]}
      />,
    );

    const card = screen.getByTestId("missions-summary-card");
    expect(within(card).getByText("Tes missions du jour")).toBeInTheDocument();
    expect(within(card).getByTestId("missions-summary-subtitle")).toHaveTextContent(
      "2 quetes terminees sur 5",
    );

    expect(within(card).getByTestId("missions-summary-category-homework")).toBeInTheDocument();
    expect(within(card).getByTestId("missions-summary-category-revision")).toBeInTheDocument();
    expect(within(card).getByTestId("missions-summary-category-training")).toBeInTheDocument();
    const homeworkCategory = within(card).getByTestId("missions-summary-category-homework");
    expect(homeworkCategory).toHaveClass("w-full", "text-left", "rounded-2xl", "border-2", "p-4", "bg-indigo-50", "border-indigo-200");
    expect(within(homeworkCategory).getByText("Devoirs")).toBeInTheDocument();
    expect(within(homeworkCategory).getByText("1 / 2")).toBeInTheDocument();
    expect(within(homeworkCategory).getByText("1 taches restantes")).toBeInTheDocument();

    expect(within(card).getByTestId("missions-summary-stars")).toHaveAttribute(
      "aria-label",
      "1 etoile gagnee sur 3",
    );
  });

  it("opens category drawer then task modal", () => {
    render(
      <MissionsSummaryCard
        missions={[
          createMission({
            id: "mission-homework-1",
            title: "Exercices fractions",
            missionCategory: "homework",
            itemSubkind: "Mathematiques",
            helpLinks: [{ id: "f1", label: "Fractions - rappel", href: "/child/knowledge?card=f1" }],
            microSteps: [
              { id: "s1", label: "Lis l'enonce", done: false },
              { id: "s2", label: "Fais l'exercice 4", done: false },
            ],
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId("missions-summary-category-homework"));

    const drawer = screen.getByTestId("missions-category-drawer");
    expect(within(drawer).getByText("Devoirs")).toBeInTheDocument();
    expect(within(drawer).getByText("Catégorie")).toBeInTheDocument();
    expect(within(drawer).getByText("tâches faites")).toBeInTheDocument();
    expect(within(drawer).getByText("étoiles à gagner")).toBeInTheDocument();
    expect(within(drawer).getByText("Exercices fractions")).toBeInTheDocument();
    expect(within(drawer).getByTestId("missions-category-list")).toHaveClass("flex-1", "overflow-y-auto");
    expect(within(drawer).getByTestId("missions-category-task-mission-homework-1")).toHaveClass(
      "w-full",
      "rounded-[16px]",
      "border-2",
      "bg-indigo-50",
      "border-indigo-200",
    );
    expect(drawer.querySelector(".h-3.overflow-hidden.rounded-full.bg-gray-200")).not.toBeNull();
    const encouragement = within(drawer).getByText(/Encore 1 tâche — tu peux le faire !/i);
    expect(encouragement).toHaveClass("text-sm", "font-medium", "text-gray-700");
    expect(encouragement.closest("div")).toHaveClass("rounded-[16px]");

    fireEvent.click(screen.getByTestId("missions-category-task-mission-homework-1"));

    const modal = screen.getByRole("dialog", { name: /Mission Exercices fractions/i });
    expect(within(modal).getByText("Ce que tu dois faire")).toBeInTheDocument();
    expect(within(modal).getByText("Demarrer un chrono")).toBeInTheDocument();
    expect(within(modal).getByText("Mes fiches d'aide")).toBeInTheDocument();
    expect(within(modal).getByTestId("mission-validate-button")).toHaveTextContent("Valider la tache");

    fireEvent.click(within(modal).getByRole("button", { name: /Time Timer/i }));
    expect(within(modal).getByTestId("time-timer-panel")).toBeInTheDocument();
    expect(within(modal).getByText("Ce que tu dois faire")).toBeInTheDocument();
    expect(within(modal).queryByText("Demarrer un chrono")).not.toBeInTheDocument();

    fireEvent.click(within(modal).getByLabelText("Fermer le Time Timer"));
    expect(within(modal).getByText("Ce que tu dois faire")).toBeInTheDocument();

    fireEvent.click(within(modal).getByLabelText("Revenir au drawer"));
    expect(screen.queryByRole("dialog", { name: /Mission Exercices fractions/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("missions-category-drawer")).toBeInTheDocument();
  });

  it("renders empty state when there are no missions", () => {
    render(<MissionsSummaryCard missions={[]} />);

    const card = screen.getByTestId("missions-summary-card");
    expect(within(card).getByTestId("missions-summary-subtitle")).toHaveTextContent(
      "0 quete terminee sur 0",
    );
    expect(within(card).queryByTestId("missions-summary-category-homework")).not.toBeInTheDocument();
    expect(within(card).getByText("Aucune mission aujourd'hui.")).toBeInTheDocument();
    expect(within(card).getByTestId("missions-summary-stars")).toHaveAttribute(
      "aria-label",
      "0 etoile gagnee sur 3",
    );
  });

  it("keeps 60 minutes displayed as 60 in drawer summary", () => {
    render(
      <MissionsSummaryCard
        missions={[
          createMission({
            id: "mission-homework-60",
            missionCategory: "homework",
            estimatedMinutes: 60,
            startTime: "16:00",
            endTime: "17:00",
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId("missions-summary-category-homework"));

    const drawer = screen.getByTestId("missions-category-drawer");
    expect(within(drawer).getByText("min au total")).toBeInTheDocument();
    expect(within(drawer).getByText("60")).toBeInTheDocument();
    expect(within(drawer).queryByText("1h")).not.toBeInTheDocument();
  });
});
