import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayTemplateEditor } from "@/features/day-templates/components/template-editor";
import type { TaskCategorySummary, TemplateWithTasks } from "@/lib/day-templates/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/actions/day-templates", () => ({
  createTemplateAction: vi.fn(),
  createTemplateBlockAction: vi.fn(),
  createTemplateTaskAction: vi.fn(),
  deleteTemplateAction: vi.fn(),
  deleteTemplateBlockAction: vi.fn(),
  deleteTemplateTaskAction: vi.fn(),
  moveTemplateTaskAction: vi.fn(),
  updateTemplateAction: vi.fn(),
  updateTemplateBlockAction: vi.fn(),
  updateTemplateTaskAction: vi.fn(),
}));

vi.mock("@/components/ds", async () => {
  const actual = await vi.importActual<typeof import("@/components/ds")>("@/components/ds");

  return {
    ...actual,
    RichTextEditor: ({
      valueHtml,
      onChangeHtml,
      placeholder,
      disabled,
    }: {
      valueHtml: string;
      onChangeHtml: (html: string) => void;
      placeholder?: string;
      disabled?: boolean;
    }) => (
      <textarea
        aria-label="Instructions (rich text)"
        value={valueHtml}
        onChange={(event) => onChangeHtml(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    ),
  };
});

const baseTemplate: TemplateWithTasks = {
  id: "template-1",
  familyId: "family-1",
  name: "Lundi",
  weekday: 1,
  isDefault: true,
  tasks: [],
  blocks: [],
};

function buildCategory(overrides: Partial<TaskCategorySummary>): TaskCategorySummary {
  return {
    id: overrides.id ?? "category-1",
    familyId: "family-1",
    code: overrides.code ?? "homework",
    name: overrides.name ?? "Devoirs",
    icon: overrides.icon ?? "homework",
    colorKey: overrides.colorKey ?? "category-ecole",
    defaultItemKind: overrides.defaultItemKind ?? "mission",
  };
}

describe("DayTemplateEditor subkind suggestions", () => {
  it("shows only canonical category labels in fixed order", () => {
    const categories: TaskCategorySummary[] = [
      buildCategory({
        id: "category-homework",
        code: "homework",
        name: "Déplacements",
        icon: "activity",
      }),
      buildCategory({
        id: "category-revision",
        code: "revision",
        name: "Activité physique",
        icon: "activity",
      }),
      buildCategory({
        id: "category-training",
        code: "training",
        name: "Sprint mental",
        icon: "sport",
      }),
      buildCategory({
        id: "category-activity",
        code: "activity",
        name: "1 épisode Naruto",
        icon: "leisure",
      }),
      buildCategory({
        id: "category-routine",
        code: "routine",
        name: "Routine custom",
        icon: "routine",
      }),
      buildCategory({
        id: "category-leisure",
        code: "leisure",
        name: "Loisirs custom",
        icon: "leisure",
      }),
      buildCategory({
        id: "category-legacy-no-code",
        code: null,
        name: "Déplacements",
        icon: "transport",
      }),
    ];

    render(
      <DayTemplateEditor
        categories={categories}
        template={baseTemplate}
        initialWeekday={1}
        knowledgeCardOptions={[]}
      />,
    );

    const categorySelect = screen.getByLabelText("Categorie");
    const optionLabels = Array.from(within(categorySelect).getAllByRole("option")).map((option) =>
      option.textContent?.trim(),
    );

    expect(optionLabels).toEqual(["Devoirs", "Révisions", "Entrainement", "Activités", "Routine", "Loisirs"]);
    expect(within(categorySelect).queryByText("Déplacements")).not.toBeInTheDocument();
    expect(within(categorySelect).queryByText("Activité physique")).not.toBeInTheDocument();
    expect(within(categorySelect).queryByText("1 épisode Naruto")).not.toBeInTheDocument();
  });

  it("resets subkind and swaps suggestions when category changes", () => {
    const categories: TaskCategorySummary[] = [
      buildCategory({
        id: "category-school",
        code: "homework",
        name: "Devoirs",
        icon: "homework",
        colorKey: "category-ecole",
        defaultItemKind: "mission",
      }),
      buildCategory({
        id: "category-leisure",
        code: "leisure",
        name: "Loisirs",
        icon: "leisure",
        colorKey: "category-loisir",
        defaultItemKind: "leisure",
      }),
    ];

    render(
      <DayTemplateEditor
        categories={categories}
        template={baseTemplate}
        initialWeekday={1}
        knowledgeCardOptions={[]}
      />,
    );

    const categorySelect = screen.getByLabelText("Categorie");
    const subkindInput = screen.getByLabelText("Sous-type (optionnel)") as HTMLInputElement;
    const suggestionsList = screen.getByTestId("task-subkind-suggestions");
    const readSuggestionValues = () =>
      Array.from(suggestionsList.querySelectorAll("option"))
        .map((entry) => entry.getAttribute("value"))
        .filter((entry): entry is string => Boolean(entry));

    expect(subkindInput).toHaveAttribute("list", "task-subkind-homework");
    expect(suggestionsList).toBeInTheDocument();
    expect(readSuggestionValues()).toContain("Lecture");
    expect(screen.getByTestId("task-subkind-hint")).toHaveTextContent(
      "Sous-type (optionnel) - suggere selon la categorie.",
    );

    fireEvent.change(subkindInput, { target: { value: "Exercices" } });
    expect(subkindInput.value).toBe("Exercices");

    fireEvent.change(categorySelect, { target: { value: "category-leisure" } });

    expect(subkindInput.value).toBe("");
    expect(subkindInput).toHaveAttribute("list", "task-subkind-leisure");
    expect(readSuggestionValues()).toContain("Jeux");
    expect(readSuggestionValues()).not.toContain("Exercices");
    expect(readSuggestionValues()).not.toContain("revision");
    expect(readSuggestionValues()).not.toContain("dessin anime");
    expect(readSuggestionValues()).not.toContain("devoirs");
  });

  it("drives suggestions from category code even when icon key is generic", () => {
    const categories: TaskCategorySummary[] = [
      buildCategory({
        id: "category-code-driven",
        code: "leisure",
        name: "Loisirs",
        icon: "default",
        colorKey: "category-loisir",
        defaultItemKind: "leisure",
      }),
    ];

    render(
      <DayTemplateEditor
        categories={categories}
        template={baseTemplate}
        initialWeekday={1}
        knowledgeCardOptions={[]}
      />,
    );

    expect(screen.getByLabelText("Sous-type (optionnel)")).toHaveAttribute("list", "task-subkind-leisure");
    expect(screen.getByTestId("task-subkind-suggestions").querySelectorAll("option")).toHaveLength(6);
    expect(screen.getByTestId("task-subkind-hint")).toHaveTextContent(
      "Sous-type (optionnel) - suggere selon la categorie.",
    );
  });

  it("renders category pill + title and hides itemKind labels in left task list cards", () => {
    const schoolCategory = buildCategory({
      id: "category-school",
      code: "homework",
      name: "Devoirs",
      icon: "homework",
      colorKey: "category-ecole",
      defaultItemKind: "mission",
    });

    const templateWithTask: TemplateWithTasks = {
      ...baseTemplate,
      tasks: [
        {
          id: "task-1",
          templateId: baseTemplate.id,
          categoryId: schoolCategory.id,
          itemKind: "mission",
          itemSubkind: "Mathematiques",
          assignedProfileId: null,
          assignedProfileDisplayName: null,
          assignedProfileRole: null,
          title: "Lecture",
          description: null,
          instructionsHtml: null,
          startTime: "08:00",
          endTime: "08:30",
          sortOrder: 0,
          pointsBase: 2,
          knowledgeCardId: null,
          knowledgeCardTitle: null,
          recommendedChildTimeBlockId: "morning",
          category: schoolCategory,
        },
      ],
      blocks: [],
    };

    render(
      <DayTemplateEditor
        categories={[schoolCategory]}
        template={templateWithTask}
        initialWeekday={1}
        knowledgeCardOptions={[]}
      />,
    );

    const title = screen.getByTestId("parent-task-title");
    expect(title).toHaveTextContent("Lecture");

    const categoryPill = screen.getByTestId("parent-task-category-pill");
    expect(categoryPill).toHaveTextContent("Devoirs");

    const taskCard = title.closest('[role="button"]');
    expect(taskCard).not.toBeNull();
    if (!taskCard) {
      throw new Error("Expected task list card container.");
    }
    const taskCardElement = taskCard as HTMLElement;

    expect(within(taskCardElement).queryByText(/^Mission$/i)).not.toBeInTheDocument();
    expect(within(taskCardElement).queryByText(/^Activite$/i)).not.toBeInTheDocument();
    expect(within(taskCardElement).queryByText(/^Loisir$/i)).not.toBeInTheDocument();
  });

  it("does not duplicate tasks in structural preview", () => {
    const schoolCategory = buildCategory({
      id: "category-school-preview",
      code: "homework",
      name: "Devoirs",
      icon: "homework",
      colorKey: "category-ecole",
      defaultItemKind: "mission",
    });

    const templateWithTask: TemplateWithTasks = {
      ...baseTemplate,
      tasks: [
        {
          id: "task-preview-1",
          templateId: baseTemplate.id,
          categoryId: schoolCategory.id,
          itemKind: "mission",
          itemSubkind: "Mathematiques",
          assignedProfileId: null,
          assignedProfileDisplayName: null,
          assignedProfileRole: null,
          title: "Revisions",
          description: null,
          instructionsHtml: null,
          startTime: "09:00",
          endTime: "09:30",
          sortOrder: 0,
          pointsBase: 3,
          knowledgeCardId: null,
          knowledgeCardTitle: null,
          recommendedChildTimeBlockId: "morning",
          category: schoolCategory,
        },
      ],
      blocks: [],
    };

    render(
      <DayTemplateEditor
        categories={[schoolCategory]}
        template={templateWithTask}
        initialWeekday={1}
        knowledgeCardOptions={[]}
      />,
    );

    expect(screen.queryByTestId("preview-task-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-task-title")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-task-category-pill")).not.toBeInTheDocument();
  });
});

