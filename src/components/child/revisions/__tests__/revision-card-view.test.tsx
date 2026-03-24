import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RevisionCardView,
  type MarkReviewedActionState,
} from "@/components/child/revisions/RevisionCardView";
import type { ExercisesPayload, StoredRevisionCardViewModel, StructuredRevisionContent } from "@/lib/revisions/types";

function buildCard(overrides: Partial<StoredRevisionCardViewModel> = {}): StoredRevisionCardViewModel {
  return {
    id: "revision-card-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Complement de nom",
    subject: "Francais",
    level: "6P",
    tags: ["grammaire"],
    status: "published",
    createdAt: "2026-02-27T10:00:00.000Z",
    updatedAt: "2026-02-27T10:00:00.000Z",
    content: {
      kind: "concept",
      summary: "Le complement de nom complete un nom.",
      steps: ["Trouve le nom complete", "Souligne le complement"],
      examples: ["Le chien du voisin aboie."],
      quiz: [],
      tips: ["Pose la question: de qui ?"],
      structured: {
        definition: [{ type: "text", text: "Le complement de nom complete un nom." }],
        jeRetiens: {
          items: [
            [
              { type: "text", text: "Il apporte une precision." },
            ],
            [
              { type: "text", text: "On peut poser la question" },
              { type: "highlight", tag: "keyword", text: "de qui ?" },
            ],
          ],
        },
        jeVois: {
          examples: [
            {
              label: "Exemple",
              explanation: "De qui ? -> du voisin",
              text: [
                [
                  { type: "text", text: "Le chien" },
                  { type: "highlight", tag: "term", text: "du voisin" },
                  { type: "text", text: "aboie." },
                ],
              ],
            },
          ],
        },
        monTruc: {
          bullets: [
            [
              { type: "text", text: "Repere le nom principal." },
            ],
          ],
        },
      },
      generatedExercises: {
        quiz: [
          {
            id: "q-generated-1",
            question: "Dans \"Le chien du voisin\", quel est le complement ?",
            choices: ["du voisin", "chien"],
            answer: "du voisin",
          },
        ],
        miniTest: ["Entoure le complement dans: Le cahier de Leo est bleu."],
      },
      concept: {
        goal: "Identifier le complement de nom.",
        blocks: {
          jeRetiens: "Le complement de nom complete un nom.",
          jeVoisHtml: "<p>Le chien du voisin aboie.</p>",
          monTruc: "Pose la question: de qui ?",
          examples: ["Le chien du voisin aboie."],
        },
        exercises: ["Trouve le complement dans la phrase."],
        quiz: [
          {
            id: "q1",
            question: "Dans \"Le livre de Sarah\", quel est le complement ?",
            choices: ["de Sarah", "livre"],
            answer: "de Sarah",
          },
        ],
        audioScript: null,
      },
    },
    ...overrides,
  };
}

describe("RevisionCardView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts in sheet mode and can switch to practice mode from sheet CTA", async () => {
    const user = userEvent.setup();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-sheet-mode")).toBeInTheDocument();
    expect(screen.getByText("Je retiens")).toBeInTheDocument();
    expect(screen.getByText("du voisin")).toBeInTheDocument();

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    expect(screen.getByTestId("revision-practice-mode")).toBeInTheDocument();
    expect(screen.getByTestId("revision-stepper")).toBeInTheDocument();
    expect(screen.getByTestId("revision-step-progress")).toBeInTheDocument();
    expect(screen.queryByTestId("revision-toggle-section-complete")).not.toBeInTheDocument();
    expect(screen.getByTestId("revision-practice-progress-summary")).toBeInTheDocument();
    expect(screen.getByTestId("revision-practice-to-sheet")).toBeInTheDocument();

    await user.click(screen.getByTestId("revision-practice-to-sheet"));
    expect(screen.getByTestId("revision-sheet-mode")).toBeInTheDocument();
  });

  it("shows completion card after visiting all practice steps, then can restart", async () => {
    const user = userEvent.setup();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    await user.click(screen.getByTestId("revision-sheet-to-practice"));

    expect(screen.getByTestId("revision-step-progress-label")).toHaveTextContent("1 / 2 etapes vues");
    expect(screen.getByText("Parcours: 1 / 2 etapes vues")).toBeInTheDocument();
    expect(screen.getByTestId("revision-practice-stage-label")).toHaveTextContent("Phase: Maintenant");
    expect(screen.queryByTestId("revision-practice-completion")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Etape 2: Je me teste/i }));

    expect(await screen.findByTestId("revision-practice-completion")).toBeInTheDocument();
    expect(screen.getByText("Parcours: 2 / 2 etapes vues")).toBeInTheDocument();
    expect(screen.getByTestId("revision-practice-stage-label")).toHaveTextContent("Phase: Fini");
    expect(screen.getByTestId("revision-practice-recap")).toBeInTheDocument();
    expect(screen.getByText("3 points a retenir")).toBeInTheDocument();

    await user.click(screen.getByTestId("revision-practice-completion-restart"));

    expect(screen.queryByTestId("revision-practice-completion")).not.toBeInTheDocument();
    expect(screen.getByTestId("revision-step-progress-label")).toHaveTextContent("1 / 2 etapes vues");
  });

  it("switches between enriched and compact sheet view", async () => {
    const user = userEvent.setup();
    const card = buildCard();
    const structured = card.content.structured;
    if (!structured) {
      throw new Error("Expected structured content in fixture.");
    }

    card.content.structured = {
      ...structured,
      jeRetiens: {
        items: [
          [{ type: "text", text: "Point 1" }],
          [{ type: "text", text: "Point 2" }],
          [{ type: "text", text: "Point 3" }],
          [{ type: "text", text: "Point 4" }],
          [{ type: "text", text: "Point 5" }],
        ],
      },
      jeVois: {
        examples: [
          {
            label: "Exemple 1",
            text: [[{ type: "text", text: "Phrase 1" }]],
          },
          {
            label: "Exemple 2",
            text: [[{ type: "text", text: "Phrase 2" }]],
          },
          {
            label: "Exemple 3",
            text: [[{ type: "text", text: "Phrase 3" }]],
          },
        ],
      },
    };

    render(<RevisionCardView card={card} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-sheet-view-toggle")).toBeInTheDocument();
    expect(screen.getByText("Point 4")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-je-vois-example-2")).toBeInTheDocument();
    expect(within(screen.getByTestId("revision-sheet-je-retiens-list")).getAllByRole("listitem")).toHaveLength(5);

    await user.click(screen.getByTestId("revision-sheet-view-compact"));

    expect(screen.queryByText("Point 4")).not.toBeInTheDocument();
    expect(screen.queryByTestId("revision-sheet-je-vois-example-2")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("revision-sheet-je-retiens-list")).getAllByRole("listitem")).toHaveLength(3);
  });

  it("persists UX preferences (guidance, motion, sheet density) between renders", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    await user.click(screen.getByTestId("revision-pref-guidance-guided"));
    await user.click(screen.getByTestId("revision-pref-motion-reduced"));
    await user.click(screen.getByTestId("revision-sheet-view-compact"));

    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-guidance-mode", "guided");
    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-motion-mode", "reduced");
    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-sheet-view-mode", "compact");

    unmount();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-guidance-mode", "guided");
    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-motion-mode", "reduced");
    expect(screen.getByTestId("revision-card-view")).toHaveAttribute("data-sheet-view-mode", "compact");
  });

  it("updates contextual practice tip when switching training steps", async () => {
    const user = userEvent.setup();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    await user.click(screen.getByTestId("revision-sheet-to-practice"));

    expect(screen.getByTestId("revision-practice-step-tip")).toHaveTextContent(
      "Astuce: commence sans regarder la correction.",
    );

    await user.click(screen.getByRole("tab", { name: /Etape 2: Je me teste/i }));

    expect(screen.getByTestId("revision-practice-step-tip")).toHaveTextContent(
      "Lis chaque choix calmement avant de verifier.",
    );
  });

  it("shows guided mode helper in practice when guidance preference is enabled", async () => {
    const user = userEvent.setup();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    await user.click(screen.getByTestId("revision-pref-guidance-guided"));
    await user.click(screen.getByTestId("revision-sheet-to-practice"));

    expect(screen.getByTestId("revision-guided-mode-note")).toBeInTheDocument();
    expect(screen.getByTestId("revision-guided-mode-note")).toHaveTextContent(
      "Mode guide actif",
    );
  });

  it("shows only training-focused sections in practice mode", async () => {
    const user = userEvent.setup();
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    expect(screen.getByRole("tab", { name: /Etape 1: A toi !/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Etape 2: Je me teste/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Je retiens/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Je vois/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Mon truc/i })).not.toBeInTheDocument();
  });

  it("renders mission-style sheet blocks when structured sections are present", () => {
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-sheet-mode")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-je-retiens")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-je-retiens-list")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-je-vois")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-mon-truc")).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-je-me-teste-micro")).toBeInTheDocument();
  });

  it("renders structured visual aids block when visualAids are provided", () => {
    const card = buildCard();
    const structured = card.content.structured;
    if (!structured) {
      throw new Error("Expected structured content in fixture.");
    }

    card.content.structured = {
      ...structured,
      visualAids: [
        {
          id: "visual-aid-1",
          kind: "step_sequence",
          title: "Addition en colonnes",
          note: "Commence toujours par les unites.",
          steps: [
            { text: "Aligne les chiffres par colonnes." },
            { text: "Additionne les unites." },
          ],
        },
      ],
    };

    render(<RevisionCardView card={card} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-sheet-visual-aids")).toBeInTheDocument();
    expect(screen.getByText("Addition en colonnes")).toBeInTheDocument();
    expect(screen.getByText("Aligne les chiffres par colonnes.")).toBeInTheDocument();
  });

  it("renders short definition from structured.definition in header", () => {
    render(<RevisionCardView card={buildCard()} showMarkReviewedControls={false} />);

    expect(screen.getByTestId("revision-sheet-definition")).toHaveTextContent(
      "Le complement de nom complete un nom.",
    );
  });

  it("uses jeRetiens.bullets when provided at runtime", () => {
    const card = buildCard();
    const structured = card.content.structured;
    if (!structured) {
      throw new Error("Expected structured content in fixture.");
    }

    const runtimeJeRetiens = {
      bullets: [
        [{ type: "text", text: "Bullet runtime 1" }],
        [{ type: "text", text: "Bullet runtime 2" }],
      ],
    } as unknown as NonNullable<StructuredRevisionContent["jeRetiens"]>;

    card.content.structured = {
      ...structured,
      jeRetiens: runtimeJeRetiens,
    };

    render(<RevisionCardView card={card} showMarkReviewedControls={false} />);

    expect(screen.getByText("Bullet runtime 1")).toBeInTheDocument();
    expect(screen.getByText("Bullet runtime 2")).toBeInTheDocument();
  });

  it("hides sheet blocks when structured sections are empty", () => {
    const sparseCard = buildCard({
      content: {
        kind: "concept",
        summary: "Resume minimal",
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        structured: {
          definition: [{ type: "text", text: "Definition courte." }],
          jeRetiens: { items: [] },
          jeVois: { examples: [] },
          monTruc: { bullets: [] },
          conjugation: [],
        },
      },
    });

    render(<RevisionCardView card={sparseCard} showMarkReviewedControls={false} />);

    expect(screen.queryByTestId("revision-sheet-je-retiens")).not.toBeInTheDocument();
    expect(screen.queryByTestId("revision-sheet-je-vois")).not.toBeInTheDocument();
    expect(screen.queryByTestId("revision-sheet-mon-truc")).not.toBeInTheDocument();
    expect(screen.queryByTestId("revision-sheet-je-me-teste-micro")).not.toBeInTheDocument();
  });

  it("can generate extra exercises from practice mode", async () => {
    const user = userEvent.setup();
    const extraExercises: ExercisesPayload = {
      quiz: [
        {
          id: "extra-q1",
          question: "Quel groupe est complement du nom ?",
          choices: ["de Leo", "chien"],
          answer: "de Leo",
        },
      ],
      miniTest: ["Ajoute un complement du nom a: La trousse ..."],
    };
    const onGenerateExtraExercisesAction = vi.fn(async () => ({
      success: true,
      exercises: extraExercises,
    }));

    render(
      <RevisionCardView
        card={buildCard()}
        showMarkReviewedControls={false}
        onGenerateExtraExercisesAction={onGenerateExtraExercisesAction}
      />,
    );

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    await user.click(screen.getByTestId("revision-generate-extra-exercises"));

    await waitFor(() => {
      expect(onGenerateExtraExercisesAction).toHaveBeenCalledWith({
        cardId: "revision-card-1",
      });
    });

    expect(screen.getByTestId("revision-extra-exercises-success")).toBeInTheDocument();
    expect(screen.getByText("Ajoute un complement du nom a: La trousse ...")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Je me teste/i }));
    await user.click(screen.getByRole("button", { name: "Je me teste" }));
    expect(screen.getByText("Quel groupe est complement du nom ?")).toBeInTheDocument();
  });

  it("shows retry action when extra exercises generation fails then succeeds", async () => {
    const user = userEvent.setup();
    const onGenerateExtraExercisesAction = vi
      .fn<
        (input: { cardId: string }) => Promise<{
          success: boolean;
          error?: string;
          exercises?: ExercisesPayload;
        }>
      >()
      .mockResolvedValueOnce({
        success: false,
        error: "Erreur temporaire.",
      })
      .mockResolvedValueOnce({
        success: true,
        exercises: {
          quiz: [
            {
              id: "retry-q1",
              question: "Question retry ?",
              choices: ["Oui", "Non"],
              answer: "Oui",
            },
          ],
          miniTest: ["Mini test retry"],
        },
      });

    render(
      <RevisionCardView
        card={buildCard()}
        showMarkReviewedControls={false}
        onGenerateExtraExercisesAction={onGenerateExtraExercisesAction}
      />,
    );

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    await user.click(screen.getByTestId("revision-generate-extra-exercises"));

    expect(await screen.findByText("Erreur temporaire.")).toBeInTheDocument();
    expect(screen.getByTestId("revision-generate-extra-exercises-retry")).toBeInTheDocument();

    await user.click(screen.getByTestId("revision-generate-extra-exercises-retry"));

    await waitFor(() => {
      expect(onGenerateExtraExercisesAction).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId("revision-extra-exercises-success")).toBeInTheDocument();
    expect(screen.getByText("Mini test retry")).toBeInTheDocument();
  });

  it("maps technical generation errors to child-friendly feedback", async () => {
    const user = userEvent.setup();
    const onGenerateExtraExercisesAction = vi.fn(async () => ({
      success: false as const,
      error: "Generation failed (OPENAI_HTTP_400). Invalid schema.",
    }));

    render(
      <RevisionCardView
        card={buildCard()}
        showMarkReviewedControls={false}
        onGenerateExtraExercisesAction={onGenerateExtraExercisesAction}
      />,
    );

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    await user.click(screen.getByTestId("revision-generate-extra-exercises"));

    expect(
      await screen.findByText("Oups, je n'ai pas pu preparer les exercices cette fois. Reessaie dans un instant."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("revision-generate-extra-exercises-back-to-sheet")).toBeInTheDocument();
  });

  it("disables extra exercises generation when structured content is missing", async () => {
    const user = userEvent.setup();
    const onGenerateExtraExercisesAction = vi.fn(async () => ({
      success: true as const,
      exercises: {
        quiz: [
          {
            id: "q1",
            question: "Question",
            choices: ["A", "B"],
            answer: "A",
          },
        ],
        miniTest: ["Mini test"],
      },
    }));

    render(
      <RevisionCardView
        card={buildCard({
          content: {
            kind: "generic",
            summary: "Resume generic",
            steps: ["Etape 1"],
            examples: [],
            quiz: [],
            tips: [],
          },
        })}
        showMarkReviewedControls={false}
        onGenerateExtraExercisesAction={onGenerateExtraExercisesAction}
      />,
    );

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    const button = screen.getByTestId("revision-generate-extra-exercises");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("revision-extra-exercises-hint")).toHaveTextContent(
      "Nouveaux exercices indisponibles pour cette fiche.",
    );
    expect(onGenerateExtraExercisesAction).not.toHaveBeenCalled();
  });

  it("submits mark-reviewed action with card id and keeps optimistic state", async () => {
    const markReviewedAction = vi.fn(async (): Promise<MarkReviewedActionState> => ({
      success: true,
      message: "Progression enregistree.",
    }));

    render(<RevisionCardView card={buildCard()} onMarkReviewedAction={markReviewedAction} />);

    fireEvent.click(screen.getByTestId("revision-mark-reviewed-button"));

    await waitFor(() => {
      expect(markReviewedAction).toHaveBeenCalledTimes(1);
    });

    const firstCall = markReviewedAction.mock.calls[0];
    if (!firstCall) {
      throw new Error("Expected mark action to be called once.");
    }
    const [, formData] = firstCall as unknown as [MarkReviewedActionState, FormData];
    expect(formData.get("cardId")).toBe("revision-card-1");
    await waitFor(() => {
      expect(screen.getByTestId("revision-mark-reviewed-message")).toHaveTextContent(
        "Progression enregistree.",
      );
    });

    expect(screen.getByTestId("revision-mark-reviewed-button")).toBeDisabled();
  });

  it("keeps fallback rendering safe for generic cards", async () => {
    const user = userEvent.setup();
    const genericCard = buildCard({
      content: {
        kind: "generic",
        summary: "Resume generique",
        steps: ["Etape 1"],
        examples: ["Exemple 1"],
        quiz: [
          {
            kind: "choices",
            prompt: "Question ?",
            choices: ["Oui", "Non"],
            answerIndex: 0,
            explanation: null,
          },
        ],
        tips: ["Astuce"],
      },
    });

    render(<RevisionCardView card={genericCard} showMarkReviewedControls={false} />);
    await user.click(screen.getByTestId("revision-sheet-to-practice"));

    expect(screen.getByRole("heading", { name: "Complement de nom" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Etape 1: A toi !/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Etape 2: Je me teste/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "A toi !" }));
    expect(screen.getAllByText("Etape 1").length).toBeGreaterThan(0);
  });
});
