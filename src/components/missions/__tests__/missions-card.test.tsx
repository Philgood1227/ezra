import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { MissionsCard } from "@/components/missions/MissionsCard";
import type { MissionUI } from "@/components/missions/types";

const updateTaskStatusActionMock = vi.fn();

vi.mock("@/lib/actions/tasks", () => ({
  updateTaskStatusAction: (...args: unknown[]) => updateTaskStatusActionMock(...args),
}));

updateTaskStatusActionMock.mockResolvedValue({
  success: true,
  data: {
    instanceId: "mission",
    status: "en_cours",
    pointsEarnedTask: 0,
    pointsDelta: 0,
    dailyPointsTotal: 0,
    unlockedAchievementLabels: [],
  },
});

function createMission(overrides: Partial<MissionUI> = {}): MissionUI {
  return {
    id: overrides.id ?? `mission-${Math.random().toString(16).slice(2)}`,
    title: overrides.title ?? "Mission",
    iconKey: overrides.iconKey ?? "school",
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
    categoryName: overrides.categoryName ?? "Ecole",
    microSteps: overrides.microSteps ?? [],
  };
}

describe("MissionsCard", () => {
  it("renders mission states and overflow for more than 4 missions", () => {
    render(
      <MissionsCard
        missions={[
          createMission({ id: "m1", title: "Lire", status: "todo" }),
          createMission({ id: "m2", title: "Ranger", status: "in_progress", sourceStatus: "en_cours" }),
          createMission({ id: "m3", title: "Maths", status: "done", sourceStatus: "termine" }),
          createMission({ id: "m4", title: "Anglais", status: "todo" }),
          createMission({ id: "m5", title: "Histoire", status: "todo" }),
          createMission({ id: "m6", title: "Geo", status: "todo" }),
        ]}
      />,
    );

    expect(screen.getByText("Tes missions du jour")).toBeInTheDocument();
    expect(screen.getAllByText("A faire").length).toBeGreaterThan(0);
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Fait")).toBeInTheDocument();
    expect(screen.getByTestId("missions-overflow-count")).toHaveTextContent("+2 autres missions");
  });

  it("opens and closes the mission drawer", async () => {
    render(
      <MissionsCard
        missions={[
          createMission({ id: "m1", title: "Maths" }),
          createMission({ id: "m2", title: "Lecture" }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voir la mission Maths" }));

    const drawer = screen.getByRole("dialog", { name: "Details mission" });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByTestId("mission-drawer-scroll")).toBeInTheDocument();
    expect(within(drawer).getByText("Ce que tu dois faire")).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("button", { name: "Fermer" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Details mission" })).not.toBeInTheDocument();
    });
  });

  it("opens focus mode and supports timer controls", () => {
    vi.useFakeTimers();

    render(
      <MissionsCard
        missions={[
          createMission({
            id: "m-focus",
            title: "Maths p.42",
            status: "in_progress",
            sourceStatus: "en_cours",
            estimatedMinutes: 15,
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Focus" }));

    const focus = screen.getByRole("dialog", { name: /Mode Focus Maths p.42/i });
    expect(focus).toBeInTheDocument();
    expect(screen.getAllByTestId("focus-timer-svg")).toHaveLength(1);
    expect(screen.getByTestId("focus-timer-value")).toHaveTextContent("15:00");

    fireEvent.click(within(focus).getByRole("button", { name: "Demarrer" }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("focus-timer-value")).toHaveTextContent("14:58");
    fireEvent.click(within(focus).getByRole("button", { name: "Pause" }));
    fireEvent.click(within(focus).getByRole("button", { name: "Reinitialiser" }));
    expect(screen.getByTestId("focus-timer-value")).toHaveTextContent("15:00");

    vi.useRealTimers();
  });
});
