import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FocusModeMission } from "@/components/missions/FocusModeMission";
import type { MissionUI } from "@/components/missions/types";

function createMission(overrides: Partial<MissionUI> = {}): MissionUI {
  return {
    id: overrides.id ?? "mission-focus-1",
    title: overrides.title ?? "Maths",
    iconKey: overrides.iconKey ?? "school",
    colorKey: overrides.colorKey ?? "category-ecole",
    startTime: overrides.startTime ?? "16:00",
    endTime: overrides.endTime ?? "16:20",
    estimatedMinutes: overrides.estimatedMinutes ?? 20,
    points: overrides.points ?? 6,
    status: overrides.status ?? "in_progress",
    sourceStatus: overrides.sourceStatus ?? "en_cours",
    instructionsHtml: overrides.instructionsHtml ?? "<p>Consigne.</p>",
    helpLinks: overrides.helpLinks ?? [],
    recommendedBlockId: overrides.recommendedBlockId ?? "home",
    recommendedBlockLabel: overrides.recommendedBlockLabel ?? "Maison",
    itemSubkind: overrides.itemSubkind ?? null,
    categoryName: overrides.categoryName ?? "Ecole",
    microSteps: overrides.microSteps ?? [],
  };
}

describe("FocusModeMission", () => {
  it("renders split instructions and Astuce tip from shared marker", async () => {
    render(
      <FocusModeMission
        open
        mission={createMission({
          instructionsHtml: [
            "<p>Lis la lecon.</p>",
            "<blockquote><p>Astuce: Commence par les exercices faciles.</p></blockquote>",
            "<ul><li>Etape 1</li></ul>",
          ].join(""),
        })}
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    const dialog = await screen.findByRole("dialog", { name: /Mode Focus Maths/i });
    expect(within(dialog).getByText("Ce que tu dois faire")).toBeInTheDocument();
    expect(within(dialog).getByText("Lis la lecon.")).toBeInTheDocument();
    expect(within(dialog).getByText("Etape 1")).toBeInTheDocument();

    const tip = within(dialog).getByTestId("focus-instructions-tip");
    expect(tip).toHaveTextContent("Commence par les exercices faciles.");
  });

  it("sanitizes unsafe HTML and hides tip when marker is absent", async () => {
    render(
      <FocusModeMission
        open
        mission={createMission({
          instructionsHtml: "<p>Fais l'exercice 3.</p><script>alert('x')</script>",
        })}
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    const dialog = await screen.findByRole("dialog", { name: /Mode Focus Maths/i });
    expect(within(dialog).queryByText("alert('x')")).not.toBeInTheDocument();
    expect(within(dialog).queryByTestId("focus-instructions-tip")).not.toBeInTheDocument();
  });

  it("keeps one timer instance, focus hierarchy classes, and callbacks", async () => {
    const onClose = vi.fn();
    const onComplete = vi.fn();

    render(
      <FocusModeMission
        open
        mission={createMission()}
        onClose={onClose}
        onComplete={onComplete}
      />,
    );

    const dialog = await screen.findByRole("dialog", { name: /Mode Focus Maths/i });
    expect(within(dialog).getAllByTestId("focus-timer-svg")).toHaveLength(1);
    expect(within(dialog).getByTestId("focus-mode-header")).toHaveClass("mission-panel-surface");
    expect(within(dialog).getByTestId("focus-timer-stage")).toHaveClass("focus-timer-stage");
    expect(within(dialog).getByTestId("focus-action-shelf")).toHaveClass("focus-action-shelf");

    fireEvent.click(within(dialog).getByRole("button", { name: "Retour" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(within(dialog).getByRole("button", { name: "J'ai fini" }));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("mission-focus-1");
    });
  });
});
