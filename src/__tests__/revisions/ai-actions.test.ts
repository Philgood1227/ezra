import { beforeEach, describe, expect, it, vi } from "vitest";

const createStoredRevisionCardMock = vi.hoisted(() => vi.fn());
const generateConceptCardWithAIMock = vi.hoisted(() => vi.fn());
const mapConceptCardToStoredRevisionDraftInputMock = vi.hoisted(() => vi.fn());
const generateProcedureCardWithAIMock = vi.hoisted(() => vi.fn());
const mapProcedureCardToStoredRevisionDraftInputMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/revisions", () => ({
  createStoredRevisionCard: createStoredRevisionCardMock,
}));

vi.mock("@/lib/revisions/generation", () => ({
  generateConceptCardWithAI: generateConceptCardWithAIMock,
  mapConceptCardToStoredRevisionDraftInput: mapConceptCardToStoredRevisionDraftInputMock,
  generateProcedureCardWithAI: generateProcedureCardWithAIMock,
  mapProcedureCardToStoredRevisionDraftInput: mapProcedureCardToStoredRevisionDraftInputMock,
  ConceptGenerationParseError: class ConceptGenerationParseError extends Error {},
  ConceptGenerationValidationError: class ConceptGenerationValidationError extends Error {},
  ProcedureGenerationParseError: class ProcedureGenerationParseError extends Error {},
  ProcedureGenerationValidationError: class ProcedureGenerationValidationError extends Error {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { generateConceptRevisionAction, generateRevisionAction } from "@/app/(parent)/parent/revisions/ai-actions";
import { OpenAIConfigError } from "@/lib/openai/client";

describe("generateRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns field errors for invalid payload", async () => {
    const result = await generateRevisionAction({
      subject: "Francais",
      type: "concept",
      level: "",
      topic: "",
      source: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected failure result.");
    }

    expect(result.fieldErrors).toMatchObject({
      level: "Level is required.",
    });
    expect(generateConceptCardWithAIMock).not.toHaveBeenCalled();
    expect(createStoredRevisionCardMock).not.toHaveBeenCalled();
  });

  it("generates a concept draft and persists it", async () => {
    generateConceptCardWithAIMock.mockResolvedValue({
      conceptCard: {
        type: "concept",
        id: "ai-concept-1",
      },
      structured: {
        definition: [{ type: "text", text: "Definition." }],
      },
      exercises: {
        quiz: [],
        miniTest: [],
      },
    });
    mapConceptCardToStoredRevisionDraftInputMock.mockReturnValue({
      title: "Le complement de phrase",
      subject: "Francais",
      level: "6P",
      status: "draft",
      tags: ["Complement de phrase"],
      content: {
        kind: "concept",
        summary: "Resume",
        steps: ["Etape"],
        examples: ["Exemple"],
        quiz: [],
        tips: ["Astuce"],
      },
    });
    createStoredRevisionCardMock.mockResolvedValue({
      success: true,
      data: {
        id: "card-generated-1",
      },
    });

    const result = await generateRevisionAction({
      subject: "Francais",
      type: "concept",
      level: "6P",
      topic: "Complement de phrase",
      source: "Regle parent",
    });

    expect(generateConceptCardWithAIMock).toHaveBeenCalledWith({
      subject: "Francais",
      level: "6P",
      topic: "Complement de phrase",
      source: "Regle parent",
    });
    expect(mapConceptCardToStoredRevisionDraftInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptCard: {
          type: "concept",
          id: "ai-concept-1",
        },
        topic: "Complement de phrase",
      }),
    );
    expect(createStoredRevisionCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Le complement de phrase",
        status: "draft",
      }),
    );
    expect(result).toEqual({
      success: true,
      cardId: "card-generated-1",
    });
  });

  it("generates a procedure draft and persists it", async () => {
    generateProcedureCardWithAIMock.mockResolvedValue({
      procedureCard: {
        type: "procedure",
        id: "ai-procedure-1",
      },
      structured: {
        definition: [{ type: "text", text: "Definition." }],
      },
      exercises: {
        quiz: [],
        miniTest: [],
      },
    });
    mapProcedureCardToStoredRevisionDraftInputMock.mockReturnValue({
      title: "Addition avec retenue",
      subject: "Mathematiques",
      level: "6P",
      status: "draft",
      tags: ["Addition"],
      content: {
        kind: "procedure",
        summary: "Objectif",
        steps: ["Etape"],
        examples: ["Exemple"],
        quiz: [],
        tips: ["Astuce"],
      },
    });
    createStoredRevisionCardMock.mockResolvedValue({
      success: true,
      data: {
        id: "card-generated-2",
      },
    });

    const result = await generateRevisionAction({
      subject: "Mathematiques",
      type: "procedure",
      level: "6P",
      topic: "Addition avec retenue",
      source: "Methode parent",
    });

    expect(generateProcedureCardWithAIMock).toHaveBeenCalledWith({
      subject: "Mathematiques",
      level: "6P",
      topic: "Addition avec retenue",
      source: "Methode parent",
    });
    expect(mapProcedureCardToStoredRevisionDraftInputMock).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      cardId: "card-generated-2",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/generate");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/card-generated-2");
    expect(revalidatePathMock).toHaveBeenCalledWith("/child/revisions/card-generated-2");
  });

  it("returns a safe OpenAI error message", async () => {
    generateConceptCardWithAIMock.mockRejectedValue(new OpenAIConfigError());

    const result = await generateRevisionAction({
      subject: "Francais",
      type: "concept",
      level: "6P",
      topic: "Complement de phrase",
      source: "Regle parent",
    });

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("OPENAI_KEY_MISSING"),
    });
    expect(createStoredRevisionCardMock).not.toHaveBeenCalled();
  });

  it("keeps backward-compatible concept wrapper", async () => {
    generateConceptCardWithAIMock.mockResolvedValue({
      conceptCard: {
        type: "concept",
        id: "ai-concept-2",
      },
      structured: {
        definition: [{ type: "text", text: "Definition." }],
      },
      exercises: {
        quiz: [],
        miniTest: [],
      },
    });
    mapConceptCardToStoredRevisionDraftInputMock.mockReturnValue({
      title: "Titre",
      subject: "Francais",
      level: "6P",
      status: "draft",
      tags: [],
      content: {
        kind: "concept",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
      },
    });
    createStoredRevisionCardMock.mockResolvedValue({
      success: true,
      data: { id: "card-generated-3" },
    });

    const result = await generateConceptRevisionAction({
      subject: "Francais",
      level: "6P",
      topic: "Sujet",
      source: "Source parent",
    });

    expect(result).toEqual({
      success: true,
      cardId: "card-generated-3",
    });
  });
});
