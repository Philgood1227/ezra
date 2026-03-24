import { beforeEach, describe, expect, it, vi } from "vitest";

const createOpenAIJsonChatCompletionMock = vi.hoisted(() => vi.fn());
const getRevisionCardByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/openai/client", () => ({
  createOpenAIJsonChatCompletion: createOpenAIJsonChatCompletionMock,
}));

vi.mock("@/lib/api/revisions", () => ({
  getRevisionCardById: getRevisionCardByIdMock,
}));

import {
  ConceptGenerationParseError,
  ConceptGenerationValidationError,
  generateConceptCardWithAI,
  generateExtraExercisesForCard,
  generateProcedureCardWithAI,
  mapConceptCardToStoredRevisionDraftInput,
  mapProcedureCardToStoredRevisionDraftInput,
} from "@/lib/revisions/generation";
import type { ConceptCard, ProcedureCard, StoredRevisionCard } from "@/lib/revisions/types";

function buildConceptCard(overrides: Partial<ConceptCard> = {}): ConceptCard {
  return {
    type: "concept",
    id: "concept-ai-1",
    subject: "Francais",
    level: "6P",
    title: "Le complement de phrase",
    goal: "Identifier le complement de phrase dans une phrase simple.",
    blocks: {
      jeRetiens: "Le complement de phrase donne une precision. Il peut etre deplace ou supprime.",
      jeVoisHtml: "<p>Dans \"Demain, je lis\", \"Demain\" est un complement.</p>",
      monTruc: "Je pose la question: quand? ou? comment?",
      examples: ["Demain, je lis."],
    },
    exercises: ["Souligne le complement dans: Le soir, Nina dessine.", "Ajoute un complement a: Tom range."],
    quiz: [
      {
        id: "q1",
        question: "Dans \"Le soir, Nina dessine\", quel est le complement?",
        choices: ["Le soir", "Nina", "dessine"],
        answer: "Le soir",
      },
      {
        id: "q2",
        question: "Le complement est-il obligatoire?",
        choices: ["Toujours", "Pas toujours"],
        answer: "Pas toujours",
      },
    ],
    audioScript: null,
    ...overrides,
  };
}

function buildProcedureCard(overrides: Partial<ProcedureCard> = {}): ProcedureCard {
  return {
    type: "procedure",
    id: "procedure-ai-1",
    subject: "Mathematiques",
    level: "6P",
    title: "Addition avec retenue",
    goal: "Poser et calculer une addition avec retenue.",
    stepsHtml: [
      "<p>Aligne les chiffres par colonnes.</p>",
      "<p>Additionne les unites puis note la retenue.</p>",
    ],
    exampleHtml: "<p>27 + 18 = 45</p>",
    monTruc: "Je verifie chaque colonne avant de passer a la suivante.",
    exercises: [
      {
        id: "ex-1",
        instruction: "Pose 36 + 17.",
        supportHtml: null,
      },
      {
        id: "ex-2",
        instruction: "Pose 48 + 29.",
        supportHtml: "<p>48 + 29</p>",
      },
    ],
    quiz: [
      {
        id: "q1",
        question: "Combien font 36 + 17 ?",
        choices: ["53", "43"],
        answer: "53",
      },
      {
        id: "q2",
        question: "Que fais-tu si la colonne des unites depasse 9 ?",
        choices: ["Je note une retenue", "Je recommence depuis zero"],
        answer: "Je note une retenue",
      },
    ],
    audioScript: null,
    ...overrides,
  };
}

function buildStoredConceptCard(): StoredRevisionCard {
  return {
    id: "card-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Le complement de phrase",
    subject: "Francais",
    level: "6P",
    tags: [],
    status: "published",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    content: {
      kind: "concept",
      summary: "Le complement de phrase.",
      steps: ["Etape 1"],
      examples: ["Exemple 1"],
      quiz: [],
      tips: [],
      structured: {
        definition: [{ type: "text", text: "Le complement de phrase complete une phrase." }],
      },
      concept: {
        goal: "Identifier le complement de phrase.",
        blocks: {
          jeRetiens: "Le complement de phrase complete une phrase.",
          jeVoisHtml: "<p>Demain, je lis.</p>",
          monTruc: "Pose la question quand ?",
          examples: ["Demain, je lis."],
        },
        exercises: ["Souligne le complement."],
        quiz: [
          {
            id: "q1",
            question: "Quel est le complement ?",
            choices: ["Demain", "Je"],
            answer: "Demain",
          },
        ],
        audioScript: null,
      },
    },
  };
}

describe("revision generation domain", () => {
  beforeEach(() => {
    createOpenAIJsonChatCompletionMock.mockReset();
    getRevisionCardByIdMock.mockReset();
  });

  it("validates and returns a structured Concept package from strict JSON", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        conceptCard: buildConceptCard({ subject: "Ignored", level: "Ignored" }),
        structured: {
          definition: [{ type: "text", text: "Definition courte." }],
          jeRetiens: {
            items: [[{ type: "text", text: "Bullet 1." }], [{ type: "text", text: "Bullet 2." }]],
          },
          jeVois: {
            examples: [{ text: [[{ type: "text", text: "Exemple 1." }]] }],
          },
          monTruc: {
            bullets: [[{ type: "text", text: "Astuce 1." }]],
          },
          visualAids: [
            {
              id: "visual-aid-1",
              kind: "step_sequence",
              title: "Etapes",
              steps: [{ text: "Etape 1" }],
            },
          ],
        },
        exercises: {
          quiz: buildConceptCard().quiz,
          miniTest: ["Mini test 1", "Mini test 2"],
        },
      }),
    );

    const result = await generateConceptCardWithAI({
      subject: "Francais",
      level: "6P",
      topic: "Complement de phrase",
      source: "Regle parent: le complement donne une precision.",
    });

    expect(result.conceptCard.type).toBe("concept");
    expect(result.conceptCard.subject).toBe("Francais");
    expect(result.structured.jeRetiens?.items.length).toBeGreaterThan(0);
    expect(result.structured.visualAids?.length).toBe(1);
    expect(result.exercises.miniTest).toContain("Mini test 1");
  });

  it("coerces a lenient concept payload into valid structured content", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        conceptCard: {
          type: "concept",
          id: "c-1",
          subject: "Francais",
          level: "6P",
          title: "Les complements de verbe",
          goal: "Identifier les complements de verbe.",
          blocks: {
            jeRetiens: "Le complement complete le verbe.",
            jeVoisHtml: "<p>Je mange une pomme.</p>",
            monTruc: "Pose la question quoi ?",
            examples: ["Je mange une pomme."],
          },
          exercises: ["Trouve le complement dans la phrase."],
          quiz: [
            {
              question: "Quel est le complement dans 'Je mange une pomme' ?",
              choices: ["une pomme", "Je"],
              answer: "une pomme",
            },
          ],
          audioScript: null,
        },
        structured: {
          definition: "Le complement apporte une precision.",
          jeRetiens: {
            bullets: ["Il complete le verbe.", "Il repond a une question."],
          },
          jeVois: {
            examples: ["Je mange une pomme."],
          },
          monTruc: {
            bullets: ["Question: quoi ?"],
          },
        },
        exercises: {
          quiz: [
            {
              question: "Question rapide",
              choices: ["A", "B"],
              answer: "A",
            },
          ],
          miniTest: ["Mini test 1"],
        },
      }),
    );

    const result = await generateConceptCardWithAI({
      subject: "Francais",
      level: "6P",
      topic: "Les complements de verbe",
      source: "Le complement de verbe complete le verbe.",
    });

    expect(result.conceptCard.quiz.length).toBeGreaterThan(0);
    expect(result.structured.definition).toBeDefined();
    expect(result.structured.jeRetiens?.items.length).toBeGreaterThan(0);
    expect(result.exercises.miniTest).toContain("Mini test 1");
  });

  it("throws parse error when OpenAI response is not JSON", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue("not-json");

    await expect(
      generateConceptCardWithAI({
        subject: "Francais",
        level: "6P",
        topic: "Complement de phrase",
      }),
    ).rejects.toBeInstanceOf(ConceptGenerationParseError);
  });

  it("normalizes malformed quiz answers instead of failing generation", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        conceptCard: buildConceptCard(),
        structured: {
          definition: [{ type: "text", text: "Definition." }],
        },
        exercises: {
          quiz: [
            {
              id: "q1",
              question: "Question invalide",
              choices: ["A", "B"],
              answer: "Z",
            },
          ],
          miniTest: [],
        },
      }),
    );

    const result = await generateConceptCardWithAI({
      subject: "Francais",
      level: "6P",
      topic: "Complement de phrase",
    });

    expect(result.exercises.quiz[0]?.answer).toBe("Z");
    expect(result.exercises.quiz[0]?.choices).toContain("Z");
  });

  it("rejects output using forbidden terms not present in source", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        conceptCard: {
          ...buildConceptCard(),
          blocks: {
            ...buildConceptCard().blocks,
            jeRetiens: "Le COD complete le verbe.",
          },
        },
        structured: {
          definition: [{ type: "text", text: "Le COD complete." }],
        },
        exercises: {
          quiz: buildConceptCard().quiz,
          miniTest: ["Trouve le COD."],
        },
      }),
    );

    await expect(
      generateConceptCardWithAI({
        subject: "Francais",
        level: "6P",
        topic: "Complement de verbe",
        source: "Dans cette lecon, on parle de complement de verbe avec des formulations simples pour les eleves.",
      }),
    ).rejects.toBeInstanceOf(ConceptGenerationValidationError);
  });

  it("maps ConceptCard into draft input with structured and generated exercises", () => {
    const conceptCard = buildConceptCard();

    const draft = mapConceptCardToStoredRevisionDraftInput({
      conceptCard,
      topic: "Complement de phrase",
      structured: {
        definition: [{ type: "text", text: "Definition test." }],
      },
      exercises: {
        quiz: conceptCard.quiz,
        miniTest: ["Mini 1"],
      },
    });

    expect(draft).toMatchObject({
      title: "Le complement de phrase",
      subject: "Francais",
      level: "6P",
      status: "draft",
      tags: ["Complement de phrase"],
      content: {
        kind: "concept",
      },
    });
    expect(draft.content?.structured).toBeDefined();
    expect(draft.content?.generatedExercises?.miniTest).toContain("Mini 1");
  });

  it("validates and returns a structured Procedure package", async () => {
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        procedureCard: buildProcedureCard({ subject: "Ignored", level: "Ignored" }),
        structured: {
          definition: [{ type: "text", text: "Definition procedure." }],
          jeRetiens: {
            items: [[{ type: "text", text: "Etape 1" }], [{ type: "text", text: "Etape 2" }]],
          },
        },
        exercises: {
          quiz: buildProcedureCard().quiz,
          miniTest: ["Mini test procedure"],
        },
      }),
    );

    const result = await generateProcedureCardWithAI({
      subject: "Mathematiques",
      level: "6P",
      topic: "Addition avec retenue",
      source: "Document parent: aligner les colonnes et noter la retenue.",
    });

    expect(result.procedureCard.type).toBe("procedure");
    expect(result.procedureCard.subject).toBe("Mathematiques");
    expect(result.exercises.miniTest).toContain("Mini test procedure");
  });

  it("maps ProcedureCard into draft input with structured payload", () => {
    const procedureCard = buildProcedureCard();

    const draft = mapProcedureCardToStoredRevisionDraftInput({
      procedureCard,
      topic: "Addition avec retenue",
    });

    expect(draft.content?.kind).toBe("procedure");
    expect(draft.content?.structured).toBeDefined();
    expect(draft.content?.generatedExercises?.quiz.length).toBeGreaterThan(0);
  });

  it("generates extra exercises from stored structured content", async () => {
    getRevisionCardByIdMock.mockResolvedValue(buildStoredConceptCard());
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        quiz: [
          {
            id: "extra-q1",
            question: "Question extra ?",
            choices: ["A", "B"],
            answer: "A",
          },
        ],
        miniTest: ["Mini test extra"],
      }),
    );

    const result = await generateExtraExercisesForCard("card-1");

    expect(getRevisionCardByIdMock).toHaveBeenCalledWith("card-1");
    expect(result.quiz).toHaveLength(1);
    expect(result.miniTest).toEqual(["Mini test extra"]);
  });

  it("coerces lenient extra exercises payload instead of failing", async () => {
    getRevisionCardByIdMock.mockResolvedValue(buildStoredConceptCard());
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        quiz: [
          {
            prompt: "Question extra reformulee ?",
            choices: ["Reponse A", "Reponse B"],
            answer: "Reponse A",
          },
        ],
        mini_test: ["Mini test depuis mini_test"],
      }),
    );

    const result = await generateExtraExercisesForCard("card-1");

    expect(result.quiz).toHaveLength(1);
    expect(result.quiz[0]?.question).toBe("Question extra reformulee ?");
    expect(result.miniTest).toEqual(["Mini test depuis mini_test"]);
  });

  it("falls back to deterministic exercises when OpenAI extra payload is invalid", async () => {
    getRevisionCardByIdMock.mockResolvedValue(buildStoredConceptCard());
    createOpenAIJsonChatCompletionMock.mockResolvedValue(
      JSON.stringify({
        quiz: [],
        miniTest: [],
      }),
    );

    const result = await generateExtraExercisesForCard("card-1");

    expect(result.quiz.length).toBeGreaterThan(0);
    expect(result.miniTest.length).toBeGreaterThan(0);
  });

  it("falls back to deterministic exercises when OpenAI request fails", async () => {
    getRevisionCardByIdMock.mockResolvedValue(buildStoredConceptCard());
    createOpenAIJsonChatCompletionMock.mockRejectedValue(new Error("network unavailable"));

    const result = await generateExtraExercisesForCard("card-1");

    expect(result.quiz.length).toBeGreaterThan(0);
    expect(result.miniTest.length).toBeGreaterThan(0);
  });
});
