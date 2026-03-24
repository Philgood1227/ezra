import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExercisesPayload, StoredRevisionCardViewModel } from "@/lib/revisions/types";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const getRevisionCardByIdMock = vi.hoisted(() => vi.fn());
const upsertRevisionProgressMock = vi.hoisted(() => vi.fn());
const generateExtraExercisesForCardMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
);

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/api/revisions", () => ({
  getRevisionCardById: getRevisionCardByIdMock,
  upsertRevisionProgress: upsertRevisionProgressMock,
}));

vi.mock("@/lib/revisions/generation", () => ({
  generateExtraExercisesForCard: generateExtraExercisesForCardMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import ChildRevisionCardPage from "@/app/(child)/child/revisions/[cardId]/page";

function buildConceptCard(overrides: Partial<StoredRevisionCardViewModel> = {}): StoredRevisionCardViewModel {
  return {
    id: "revision-card-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Fractions",
    subject: "Maths",
    level: "CM1",
    tags: [],
    status: "published",
    content: {
      kind: "concept",
      summary: "Retiens les fractions equivalentes.",
      steps: ["Calcule 1/2 en quarts", "Calcule 2/3 en sixiemes"],
      examples: ["1/2 = 2/4"],
      quiz: [],
      tips: ["Lis a voix basse."],
      structured: {
        definition: [{ type: "text", text: "Les fractions equivalentes representent la meme quantite." }],
        jeRetiens: {
          items: [[{ type: "text", text: "On multiplie numerateur et denominateur par le meme nombre." }]],
        },
        jeVois: {
          examples: [
            {
              text: [[{ type: "text", text: "1/2 = 2/4" }]],
            },
          ],
        },
      },
      concept: {
        goal: "Comparer et reconnaitre des fractions equivalentes.",
        blocks: {
          jeRetiens: "Deux fractions equivalentes representent la meme quantite.",
          jeVoisHtml: "<p>1/2 = 2/4</p>",
          monTruc: "Je multiplie numerateur et denominateur par le meme nombre.",
          examples: ["1/2 = 2/4"],
        },
        exercises: ["Trouve une fraction equivalente a 3/5"],
        quiz: [
          {
            id: "fractions-q1",
            question: "Quelle fraction est equivalente a 1/2 ?",
            choices: ["2/4", "3/4"],
            answer: "2/4",
          },
        ],
        audioScript: null,
      },
    },
    createdAt: "2026-02-27T10:00:00.000Z",
    updatedAt: "2026-02-27T10:00:00.000Z",
    ...overrides,
  };
}

function buildCardByKind(kind: "procedure" | "vocab" | "comprehension"): StoredRevisionCardViewModel {
  if (kind === "procedure") {
    return buildConceptCard({
      content: {
        kind: "procedure",
        summary: "Apprendre une methode.",
        steps: ["Etape 1"],
        examples: ["Exemple 1"],
        quiz: [],
        tips: ["Astuce"],
        structured: {
          definition: [{ type: "text", text: "Suis les etapes dans l'ordre." }],
          jeRetiens: { items: [[{ type: "text", text: "Aligne puis calcule." }]] },
        },
        procedure: {
          goal: "Apprendre une methode.",
          stepsHtml: ["<p>Aligne</p>", "<p>Calcule</p>"],
          exampleHtml: "<p>27 + 18 = 45</p>",
          monTruc: "Je verifie chaque colonne.",
          exercises: [{ id: "ex-1", instruction: "Pose 36 + 17.", supportHtml: null }],
          quiz: [{ id: "q1", question: "36 + 17 ?", choices: ["53", "43"], answer: "53" }],
          audioScript: null,
        },
      },
      title: "Soustraction avec emprunt",
    });
  }

  if (kind === "vocab") {
    return buildConceptCard({
      content: {
        kind: "vocab",
        summary: "Memoriser le vocabulaire.",
        steps: ["Relie", "Traduis"],
        examples: ["das Haus - la maison"],
        quiz: [],
        tips: ["Repete chaque jour"],
        structured: {
          definition: [{ type: "text", text: "Apprends les mots de la maison." }],
          jeRetiens: {
            items: [[{ type: "highlight", tag: "term", text: "das Haus" }, { type: "text", text: " la maison" }]],
          },
        },
        vocab: {
          goal: "Utiliser les mots en contexte.",
          items: [
            {
              id: "v1",
              term: "das Haus",
              translation: "la maison",
              exampleSentence: "Das Haus ist gross.",
              exampleTranslation: "La maison est grande.",
            },
          ],
          activities: ["Relie les mots"],
          quiz: [{ id: "q1", question: "die Schule ?", choices: ["ecole", "chaise"], answer: "ecole" }],
          audioScript: null,
        },
      },
      title: "Vocabulaire de l'ecole",
    });
  }

  return buildConceptCard({
    content: {
      kind: "comprehension",
      summary: "Comprendre un texte.",
      steps: ["Question 1"],
      examples: ["Texte court"],
      quiz: [],
      tips: ["Relis doucement"],
      structured: {
        definition: [{ type: "text", text: "Lis puis reponds aux questions." }],
      },
      comprehension: {
        goal: "Identifier les infos explicites.",
        text: "Le lac est calme ce matin.",
        textTranslation: "The lake is calm this morning.",
        questions: [{ id: "q1", question: "Comment est le lac ?", choices: ["Calme", "Agite"], answer: "Calme" }],
        openQuestions: ["Qu'imagines-tu ?"],
        quiz: [{ id: "quiz1", question: "Quand ?", choices: ["Matin", "Soir"], answer: "Matin" }],
        audioScript: null,
      },
    },
    title: "Lecture: Le lac en hiver",
  });
}

describe("Child revision card page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentProfileMock.mockResolvedValue({
      role: "child",
      familyId: "family-1",
      source: "child-pin",
      profile: {
        id: "child-1",
        family_id: "family-1",
        display_name: "Ezra",
        role: "child",
        avatar_url: null,
        pin_hash: null,
        created_at: "2026-02-27T10:00:00.000Z",
      },
    });

    getRevisionCardByIdMock.mockResolvedValue(buildConceptCard());
    upsertRevisionProgressMock.mockResolvedValue({ success: true });
    generateExtraExercisesForCardMock.mockResolvedValue({
      quiz: [{ id: "extra-1", question: "Question extra ?", choices: ["A", "B"], answer: "A" }],
      miniTest: ["Mini test extra"],
    } satisfies ExercisesPayload);
  });

  it("renders concept card in sheet mode then practice mode", async () => {
    const user = userEvent.setup();
    const element = await ChildRevisionCardPage({
      params: Promise.resolve({ cardId: "revision-card-1" }),
    });

    render(element);
    expect(screen.getByRole("heading", { name: "Fractions" })).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-mode")).toBeInTheDocument();

    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    expect(screen.getByTestId("revision-practice-mode")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Je me teste/i }));
    await user.click(screen.getByRole("button", { name: "Je me teste" }));
    expect(screen.getByText("Quelle fraction est equivalente a 1/2 ?")).toBeInTheDocument();
  });

  it("generates extra exercises without leaving page", async () => {
    const user = userEvent.setup();
    const element = await ChildRevisionCardPage({
      params: Promise.resolve({ cardId: "revision-card-1" }),
    });

    render(element);
    await user.click(screen.getByTestId("revision-sheet-to-practice"));
    await user.click(screen.getByTestId("revision-generate-extra-exercises"));

    expect(generateExtraExercisesForCardMock).toHaveBeenCalledWith("revision-card-1");
    await user.click(screen.getByRole("tab", { name: /Mini test rapide/i }));
    await user.click(screen.getByRole("button", { name: "Mini test rapide" }));
    expect(screen.getByText("Mini test extra")).toBeInTheDocument();
  });

  it("renders each non-concept type without crashing", async () => {
    const user = userEvent.setup();
    for (const kind of ["procedure", "vocab", "comprehension"] as const) {
      getRevisionCardByIdMock.mockResolvedValueOnce(buildCardByKind(kind));

      const element = await ChildRevisionCardPage({
        params: Promise.resolve({ cardId: `card-${kind}` }),
      });

      const { unmount } = render(element);
      await user.click(screen.getByTestId("revision-sheet-to-practice"));
      expect(screen.getByTestId("revision-practice-mode")).toBeInTheDocument();
      unmount();
    }
  });

  it("calls notFound when card does not exist", async () => {
    getRevisionCardByIdMock.mockResolvedValue(null);

    await expect(
      ChildRevisionCardPage({
        params: Promise.resolve({ cardId: "missing-card" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
