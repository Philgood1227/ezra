import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentRevisionEditPage } from "@/components/parent/revisions/parent-revision-edit-page";
import type { StoredRevisionCard } from "@/lib/revisions/types";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/components/child/revisions", () => ({
  RevisionCardView: ({ card }: { card: { title: string; content: { kind: string } } }) => (
    <div data-testid="child-preview">
      <span>{card.title}</span>
      <span>{card.content.kind}</span>
    </div>
  ),
}));

vi.mock("@/components/ds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ds")>();
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccessMock,
      error: toastErrorMock,
      info: vi.fn(),
      warning: vi.fn(),
      dismiss: vi.fn(),
    }),
  };
});

function buildConceptCard(overrides: Partial<StoredRevisionCard> = {}): StoredRevisionCard {
  return {
    id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Le complement de phrase",
    subject: "Francais",
    level: "6P",
    tags: ["grammaire"],
    status: "draft",
    content: {
      kind: "concept",
      summary: "Le complement donne une precision.",
      steps: ["Souligne le complement."],
      examples: ["Demain, Nina lit."],
      quiz: [
        {
          kind: "choices",
          prompt: "Quel est le complement ?",
          choices: ["Demain", "Nina"],
          answerIndex: 0,
          explanation: null,
        },
      ],
      tips: ["Pose la question: quand ?"],
    },
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

function buildProcedureCard(): StoredRevisionCard {
  return {
    ...buildConceptCard(),
    content: {
      kind: "procedure",
      summary: "Apprendre la methode.",
      steps: ["Etape 1"],
      examples: ["Exemple 1"],
      quiz: [],
      tips: ["Astuce"],
      procedure: {
        goal: "Apprendre la methode.",
        stepsHtml: ["<p>Etape 1</p>"],
        exampleHtml: "<p>Exemple 1</p>",
        monTruc: "Astuce",
        exercises: [
          {
            id: "exercise-1",
            instruction: "Exercice 1",
            supportHtml: null,
          },
        ],
        quiz: [],
        audioScript: null,
      },
    },
  };
}

describe("ParentRevisionEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders concept fields prefilled and updates child preview", () => {
    render(
      <ParentRevisionEditPage
        initialCard={buildConceptCard()}
        onSaveAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Le complement de phrase");
    expect(screen.getByLabelText("Definition")).toBeInTheDocument();
    const openPreviewButtons = screen.getAllByRole("button", { name: "Open preview" });
    const firstOpenPreviewButton = openPreviewButtons[0];
    if (!firstOpenPreviewButton) {
      throw new Error("Missing Open preview button.");
    }
    fireEvent.click(firstOpenPreviewButton);
    expect(screen.getByTestId("child-preview")).toHaveTextContent("Le complement de phrase");

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Nouveau titre" } });
    expect(screen.getByTestId("child-preview")).toHaveTextContent("Nouveau titre");
    expect(screen.getByTestId("child-preview")).toHaveTextContent("concept");
  });

  it("submits concept payload and shows success toast", async () => {
    const onSaveAction = vi.fn(async () => ({ success: true }));

    render(<ParentRevisionEditPage initialCard={buildConceptCard()} onSaveAction={onSaveAction} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Titre modifie" } });
    fireEvent.change(screen.getByLabelText("Definition"), { target: { value: "Je retiens modifie" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSaveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
          title: "Titre modifie",
          content: expect.objectContaining({
            kind: "concept",
            summary: "Je retiens modifie",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Revision saved.");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("adds a visual aid template and persists it in structured content", async () => {
    const onSaveAction = vi.fn(async () => ({ success: true }));
    render(<ParentRevisionEditPage initialCard={buildConceptCard()} onSaveAction={onSaveAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un schema" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSaveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            structured: expect.objectContaining({
              visualAids: expect.arrayContaining([
                expect.objectContaining({
                  kind: "step_sequence",
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  it("applies multiple highlight styles on one line without clearing previous ones", () => {
    render(
      <ParentRevisionEditPage
        initialCard={buildConceptCard()}
        onSaveAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    const definitionField = screen.getByLabelText("Definition") as HTMLTextAreaElement;
    const definitionEditor = screen.getByText("Definition").closest("div");
    if (!definitionEditor) {
      throw new Error("Definition editor not found.");
    }

    fireEvent.change(definitionField, { target: { value: "Additionner en colonnes" } });

    definitionField.setSelectionRange(0, 11);
    fireEvent.select(definitionField);
    fireEvent.click(within(definitionEditor).getByRole("button", { name: /Mettre en avant/i }));

    definitionField.setSelectionRange(15, 23);
    fireEvent.select(definitionField);
    fireEvent.click(within(definitionEditor).getByRole("button", { name: /Terminaison/i }));

    expect(within(definitionEditor).getByText("Additionner")).toHaveClass("bg-status-warning/20");
    expect(within(definitionEditor).getByText("colonnes")).toHaveClass("underline");
  });

  it("shows server error feedback without navigation", async () => {
    const onSaveAction = vi.fn(async () => ({
      success: false,
      error: "Unable to save revision card.",
      fieldErrors: {
        title: "Title must contain at least 2 characters.",
      },
    }));

    render(<ParentRevisionEditPage initialCard={buildConceptCard()} onSaveAction={onSaveAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((alert) => alert.textContent?.includes("Unable to save revision card."))).toBe(true);
      expect(toastErrorMock).toHaveBeenCalledWith("Unable to save revision card.");
    });

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders non-concept JSON editor and submits full content", async () => {
    const onSaveAction = vi.fn(async () => ({ success: true }));
    render(<ParentRevisionEditPage initialCard={buildProcedureCard()} onSaveAction={onSaveAction} />);

    expect(screen.getByText("procedure content")).toBeInTheDocument();
    const jsonEditor = screen
      .getAllByRole("textbox")
      .find((node) => node.textContent?.includes("\"kind\": \"procedure\"") || (node as HTMLTextAreaElement).value?.includes("\"kind\": \"procedure\""));
    if (!jsonEditor) {
      throw new Error("Expected JSON editor.");
    }
    expect((jsonEditor as HTMLTextAreaElement).value.includes("\"kind\": \"procedure\"")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSaveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            kind: "procedure",
          }),
        }),
      );
    });
  });
});
