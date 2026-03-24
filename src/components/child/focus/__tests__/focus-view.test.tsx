import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FocusView } from "@/components/child/focus/focus-view";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ds/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/components/timers/circular-timer", () => ({
  CircularTimer: ({
    onFinished,
  }: {
    onFinished: () => void;
  }) => (
    <button
      type="button"
      aria-label="Minuteur mock"
      data-testid="focus-view-circular-timer"
      onClick={onFinished}
    >
      Mock timer
    </button>
  ),
}));

function createInstance(overrides: Partial<TaskInstanceSummary> = {}): TaskInstanceSummary {
  return {
    id: overrides.id ?? "instance-focus-1",
    familyId: overrides.familyId ?? "family-1",
    childProfileId: overrides.childProfileId ?? "child-1",
    templateTaskId: overrides.templateTaskId ?? "task-1",
    itemKind: overrides.itemKind ?? "mission",
    itemSubkind: overrides.itemSubkind ?? null,
    assignedProfileId: overrides.assignedProfileId ?? null,
    assignedProfileDisplayName: overrides.assignedProfileDisplayName ?? null,
    assignedProfileRole: overrides.assignedProfileRole ?? null,
    date: overrides.date ?? "2026-02-26",
    status: overrides.status ?? "en_cours",
    startTime: overrides.startTime ?? "16:00",
    endTime: overrides.endTime ?? "16:20",
    pointsBase: overrides.pointsBase ?? 5,
    pointsEarned: overrides.pointsEarned ?? 0,
    title: overrides.title ?? "Lecture",
    description: overrides.description ?? "Description",
    sortOrder: overrides.sortOrder ?? 1,
    knowledgeCardId: overrides.knowledgeCardId ?? null,
    knowledgeCardTitle: overrides.knowledgeCardTitle ?? null,
    isReadOnly: overrides.isReadOnly ?? false,
    source: overrides.source ?? "template_task",
    sourceRefId: overrides.sourceRefId ?? "template-task-1",
    recommendedChildTimeBlockId: overrides.recommendedChildTimeBlockId ?? "home",
    instructionsHtml: overrides.instructionsHtml ?? "<p>Consigne.</p>",
    estimatedMinutes: overrides.estimatedMinutes ?? 20,
    helpLinks: overrides.helpLinks ?? [],
    category: overrides.category ?? {
      id: "cat-1",
      familyId: "family-1",
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
      defaultItemKind: "mission",
    },
  };
}

describe("FocusView", () => {
  it("renders sanitized instructions and Astuce section using shared split helper", () => {
    render(
      <FocusView
        instance={createInstance({
          instructionsHtml: [
            "<p>Lis la fiche.</p>",
            "<blockquote><p>Astuce: Souligne les mots importants.</p></blockquote>",
            "<script>alert('x')</script>",
          ].join(""),
        })}
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Ce que tu dois faire")).toBeInTheDocument();
    expect(screen.getByText("Lis la fiche.")).toBeInTheDocument();
    expect(screen.queryByText("alert('x')")).not.toBeInTheDocument();

    const tip = screen.getByTestId("focus-instructions-tip");
    expect(within(tip).getByText("Astuce")).toBeInTheDocument();
    expect(tip).toHaveTextContent("Souligne les mots importants.");
    expect(screen.getByTestId("focus-view-header")).toHaveClass("mission-panel-surface");
    expect(screen.getByTestId("focus-timer-stage")).toHaveClass("focus-timer-stage");
    expect(screen.getByTestId("focus-instructions-main")).toHaveClass("focus-instructions-surface");
  });

  it("does not crash and hides tip when instructions are empty", () => {
    render(
      <FocusView
        instance={createInstance({
          instructionsHtml: "",
        })}
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Ce que tu dois faire")).toBeInTheDocument();
    expect(screen.getByText("Aucune consigne pour le moment.")).toBeInTheDocument();
    expect(screen.queryByTestId("focus-instructions-tip")).not.toBeInTheDocument();
  });

  it("renders one timer and keeps onSessionComplete callback behavior in overlay", async () => {
    const onSessionComplete = vi.fn();

    render(
      <FocusView
        instance={createInstance()}
        presentation="overlay"
        onClose={vi.fn()}
        onSessionComplete={onSessionComplete}
      />,
    );

    expect(screen.getAllByTestId("focus-view-circular-timer")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    fireEvent.click(screen.getByTestId("focus-view-circular-timer"));

    await waitFor(() => {
      expect(onSessionComplete).toHaveBeenCalledWith(5);
    });
  });
});
