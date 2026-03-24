import { beforeEach, describe, expect, it, vi } from "vitest";

const createBookMock = vi.hoisted(() => vi.fn());
const deleteBookMock = vi.hoisted(() => vi.fn());
const startBookIndexingMock = vi.hoisted(() => vi.fn());
const getBookByIdMock = vi.hoisted(() => vi.fn());
const createStoredRevisionCardMock = vi.hoisted(() => vi.fn());
const findRelevantBookChunksMock = vi.hoisted(() => vi.fn());
const generateConceptCardWithAIMock = vi.hoisted(() => vi.fn());
const mapConceptCardToStoredRevisionDraftInputMock = vi.hoisted(() => vi.fn());
const generateProcedureCardWithAIMock = vi.hoisted(() => vi.fn());
const mapProcedureCardToStoredRevisionDraftInputMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/books", () => ({
  createBook: createBookMock,
  deleteBook: deleteBookMock,
  startBookIndexing: startBookIndexingMock,
  getBookById: getBookByIdMock,
}));

vi.mock("@/lib/api/revisions", () => ({
  createStoredRevisionCard: createStoredRevisionCardMock,
}));

vi.mock("@/lib/books/rag", () => ({
  findRelevantBookChunks: findRelevantBookChunksMock,
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

import {
  createBookAction,
  deleteBookAction,
  generateRevisionFromBookAction,
  startBookIndexingAction,
} from "@/app/(parent)/parent/resources/books/actions";

describe("parent resources books actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns field errors for invalid create-book payload", async () => {
    const result = await createBookAction({
      subject: "french",
      level: "",
      title: "A",
      schoolYear: "",
      fileName: "lesson.txt",
      fileMimeType: "text/plain",
      fileBase64: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected failure result.");
    }

    expect(result.fieldErrors).toBeDefined();
    expect(createBookMock).not.toHaveBeenCalled();
  });

  it("creates a book and revalidates resources page", async () => {
    createBookMock.mockResolvedValue({
      success: true,
      data: { id: "book-1" },
    });

    const result = await createBookAction({
      subject: "french",
      level: "6P",
      title: "Francais 6P",
      schoolYear: "2025-2026",
      fileName: "manuel.pdf",
      fileMimeType: "application/pdf",
      fileBase64: "ZmFrZS1wZGY=",
    });

    expect(createBookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "french",
        level: "6P",
        title: "Francais 6P",
      }),
    );
    expect(result).toEqual({
      success: true,
      bookId: "book-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/resources/books");
  });

  it("creates a book even when PDF payload is missing", async () => {
    createBookMock.mockResolvedValue({
      success: true,
      data: { id: "book-no-payload" },
    });

    const result = await createBookAction({
      subject: "french",
      level: "6P",
      title: "Francais 6P",
      schoolYear: "2025-2026",
      fileName: "manuel.pdf",
      fileMimeType: "application/pdf",
      fileBase64: "",
    });

    expect(createBookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileBase64: null,
      }),
    );
    expect(result).toEqual({
      success: true,
      bookId: "book-no-payload",
    });
  });

  it("starts indexing and revalidates resources page", async () => {
    startBookIndexingMock.mockResolvedValue({
      success: true,
      data: { id: "book-2" },
    });

    const result = await startBookIndexingAction({
      bookId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(startBookIndexingMock).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/resources/books");
  });

  it("deletes a book and revalidates resources page", async () => {
    deleteBookMock.mockResolvedValue({
      success: true,
      data: { id: "book-delete-1" },
    });

    const result = await deleteBookAction({
      bookId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(deleteBookMock).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/resources/books");
  });

  it("rejects generation when book is not indexed", async () => {
    getBookByIdMock.mockResolvedValue({
      id: "book-3",
      subject: "french",
      level: "6P",
      title: "Francais 6P",
      status: "uploaded",
    });

    const result = await generateRevisionFromBookAction({
      bookId: "550e8400-e29b-41d4-a716-446655440000",
      type: "concept",
      topic: "Complement de nom",
    });

    expect(result).toEqual({
      success: false,
      error: "Book must be indexed before generating a revision.",
    });
    expect(generateConceptCardWithAIMock).not.toHaveBeenCalled();
  });

  it("generates a concept revision draft from indexed book context", async () => {
    getBookByIdMock.mockResolvedValue({
      id: "book-4",
      subject: "french",
      level: "6P",
      title: "Francais 6P",
      status: "indexed",
    });
    findRelevantBookChunksMock.mockResolvedValue({
      bookId: "book-4",
      chunks: [{ id: "chunk-1", content: "Source", score: 1 }],
      mergedContext: "Source",
    });
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
      title: "Complement de nom",
      subject: "Francais",
      level: "6P",
      status: "draft",
      tags: ["Complement de nom"],
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
      data: { id: "card-book-1" },
    });

    const result = await generateRevisionFromBookAction({
      bookId: "550e8400-e29b-41d4-a716-446655440000",
      type: "concept",
      topic: "Complement de nom",
    });

    expect(generateConceptCardWithAIMock).toHaveBeenCalledWith({
      subject: "Francais",
      level: "6P",
      topic: "Complement de nom",
      source: "Source",
    });
    expect(createStoredRevisionCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          source: {
            sourceType: "book",
            bookId: "book-4",
            bookTitle: "Francais 6P",
          },
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      cardId: "card-book-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
  });
});
