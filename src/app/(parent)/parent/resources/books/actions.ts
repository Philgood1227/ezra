"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBook, deleteBook, getBookById, startBookIndexing } from "@/lib/api/books";
import { createStoredRevisionCard } from "@/lib/api/revisions";
import { BOOK_SUBJECT_OPTIONS, BOOK_SUBJECT_LABELS } from "@/lib/books/constants";
import { findRelevantBookChunks } from "@/lib/books/rag";
import type { Subject } from "@/lib/books/types";
import { OpenAIClientError } from "@/lib/openai/client";
import {
  ConceptGenerationParseError,
  ConceptGenerationValidationError,
  generateConceptCardWithAI,
  generateProcedureCardWithAI,
  mapConceptCardToStoredRevisionDraftInput,
  mapProcedureCardToStoredRevisionDraftInput,
  ProcedureGenerationParseError,
  ProcedureGenerationValidationError,
} from "@/lib/revisions/generation";
import { PARENT_REVISION_AI_TYPE_OPTIONS, type ParentRevisionAIType } from "@/lib/revisions/parent-drafts";

export interface CreateBookActionInput {
  subject: Subject;
  level: string;
  title: string;
  schoolYear: string;
  fileName: string;
  fileMimeType?: string;
  fileBase64?: string;
}

export interface CreateBookActionResult {
  success: boolean;
  error?: string;
  bookId?: string;
  fieldErrors?: Partial<Record<keyof CreateBookActionInput, string>>;
}

export interface StartBookIndexingActionResult {
  success: boolean;
  error?: string;
}

export interface DeleteBookActionResult {
  success: boolean;
  error?: string;
}

export interface GenerateRevisionFromBookActionInput {
  bookId: string;
  type: ParentRevisionAIType;
  topic: string;
}

export interface GenerateRevisionFromBookActionResult {
  success: boolean;
  error?: string;
  cardId?: string;
  fieldErrors?: Partial<Record<keyof GenerateRevisionFromBookActionInput, string>>;
}

const createBookActionInputSchema = z.object({
  subject: z.enum(BOOK_SUBJECT_OPTIONS),
  level: z
    .string()
    .max(120, "Level is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length > 0, "Level is required."),
  title: z
    .string()
    .max(200, "Title is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Title must contain at least 2 characters."),
  schoolYear: z
    .string()
    .max(80, "School year is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim()),
  fileName: z
    .string()
    .max(240, "File name is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.toLocaleLowerCase().endsWith(".pdf"), "Only PDF files are accepted."),
  fileMimeType: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  fileBase64: z
    .string()
    .max(70_000_000, "PDF payload is too large.")
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = value.trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
});

const startBookIndexingSchema = z.object({
  bookId: z.string().uuid("Invalid book id."),
});

const deleteBookSchema = z.object({
  bookId: z.string().uuid("Invalid book id."),
});

const generateRevisionFromBookInputSchema = z.object({
  bookId: z.string().uuid("Invalid book id."),
  type: z.enum(PARENT_REVISION_AI_TYPE_OPTIONS),
  topic: z
    .string()
    .max(180, "Topic is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Topic must contain at least 2 characters."),
});

function toCreateBookFieldErrors(
  input: z.ZodError,
): Partial<Record<keyof CreateBookActionInput, string>> {
  const fieldErrors: Partial<Record<keyof CreateBookActionInput, string>> = {};
  input.issues.forEach((issue) => {
    const field = issue.path[0];
    if (
      field === "subject" ||
      field === "level" ||
      field === "title" ||
      field === "schoolYear" ||
      field === "fileName" ||
      field === "fileMimeType" ||
      field === "fileBase64"
    ) {
      fieldErrors[field] = issue.message;
    }
  });
  return fieldErrors;
}

function toGenerateFieldErrors(
  input: z.ZodError,
): Partial<Record<keyof GenerateRevisionFromBookActionInput, string>> {
  const fieldErrors: Partial<Record<keyof GenerateRevisionFromBookActionInput, string>> = {};
  input.issues.forEach((issue) => {
    const field = issue.path[0];
    if (field === "bookId" || field === "type" || field === "topic") {
      fieldErrors[field] = issue.message;
    }
  });
  return fieldErrors;
}

function mapBookSubjectToRevisionSubject(subject: Subject): string {
  return BOOK_SUBJECT_LABELS[subject];
}

function toSafeGenerationError(error: unknown): string {
  if (error instanceof OpenAIClientError) {
    return `Generation failed (${error.code}). ${error.safeMessageFr}`;
  }

  if (
    error instanceof ConceptGenerationParseError ||
    error instanceof ConceptGenerationValidationError ||
    error instanceof ProcedureGenerationParseError ||
    error instanceof ProcedureGenerationValidationError
  ) {
    console.warn("[books] generation_from_book_invalid_ai_output", {
      errorName: error.name,
      errorMessage: error.message,
      ...(error instanceof ConceptGenerationValidationError || error instanceof ProcedureGenerationValidationError
        ? { issues: error.issues }
        : {}),
    });
    return "Generation failed. The AI output was invalid. Please try again.";
  }

  console.error("[books] generation_from_book_unexpected_error", {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  return "Generation failed. An unexpected error occurred.";
}

export async function createBookAction(
  input: CreateBookActionInput,
): Promise<CreateBookActionResult> {
  try {
    const parsed = createBookActionInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid form values.",
        fieldErrors: toCreateBookFieldErrors(parsed.error),
      };
    }

    const creation = await createBook({
      subject: parsed.data.subject,
      level: parsed.data.level,
      title: parsed.data.title,
      schoolYear: parsed.data.schoolYear || null,
      fileName: parsed.data.fileName,
      fileMimeType: parsed.data.fileMimeType || "application/pdf",
      fileBase64: parsed.data.fileBase64,
    });

    if (!creation.success || !creation.data) {
      return {
        success: false,
        error: creation.error ?? "Unable to create book.",
      };
    }

    revalidatePath("/parent/resources/books");

    return {
      success: true,
      bookId: creation.data.id,
    };
  } catch (error) {
    console.error("[books] create_book_action_unexpected_error", {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Unable to create book.",
    };
  }
}

export async function startBookIndexingAction(input: {
  bookId: string;
}): Promise<StartBookIndexingActionResult> {
  const parsed = startBookIndexingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid book id.",
    };
  }

  const result = await startBookIndexing(parsed.data.bookId);
  revalidatePath("/parent/resources/books");
  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Unable to index book.",
    };
  }

  return { success: true };
}

export async function deleteBookAction(input: { bookId: string }): Promise<DeleteBookActionResult> {
  const parsed = deleteBookSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid book id.",
    };
  }

  const result = await deleteBook(parsed.data.bookId);
  revalidatePath("/parent/resources/books");
  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Unable to delete book.",
    };
  }

  return {
    success: true,
  };
}

export async function generateRevisionFromBookAction(
  input: GenerateRevisionFromBookActionInput,
): Promise<GenerateRevisionFromBookActionResult> {
  const parsed = generateRevisionFromBookInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form values.",
      fieldErrors: toGenerateFieldErrors(parsed.error),
    };
  }

  const book = await getBookById(parsed.data.bookId);
  if (!book) {
    return {
      success: false,
      error: "Book not found.",
    };
  }

  if (book.status !== "indexed") {
    return {
      success: false,
      error: "Book must be indexed before generating a revision.",
    };
  }

  try {
    const context = await findRelevantBookChunks(book.id, parsed.data.topic);
    const subject = mapBookSubjectToRevisionSubject(book.subject);

    let createInput;
    if (parsed.data.type === "procedure") {
      const generated = await generateProcedureCardWithAI({
        subject,
        level: book.level,
        topic: parsed.data.topic,
        source: context.mergedContext,
      });
      createInput = mapProcedureCardToStoredRevisionDraftInput({
        procedureCard: generated.procedureCard,
        topic: parsed.data.topic,
        structured: generated.structured,
        exercises: generated.exercises,
      });
    } else {
      const generated = await generateConceptCardWithAI({
        subject,
        level: book.level,
        topic: parsed.data.topic,
        source: context.mergedContext,
      });
      createInput = mapConceptCardToStoredRevisionDraftInput({
        conceptCard: generated.conceptCard,
        topic: parsed.data.topic,
        structured: generated.structured,
        exercises: generated.exercises,
      });
    }

    const createInputContent = createInput.content;
    if (!createInputContent) {
      return {
        success: false,
        error: "Generation failed. Missing card content.",
      };
    }

    createInput = {
      ...createInput,
      tags: [...new Set([...(createInput.tags ?? []), "Manuel", book.title])],
      content: {
        ...createInputContent,
        source: {
          sourceType: "book" as const,
          bookId: book.id,
          bookTitle: book.title,
        },
      },
    };

    const creation = await createStoredRevisionCard(createInput);
    if (!creation.success || !creation.data) {
      return {
        success: false,
        error: creation.error ?? "Unable to create revision card from book.",
      };
    }

    revalidatePath("/parent/resources/books");
    revalidatePath("/parent/revisions");
    revalidatePath(`/parent/revisions/${creation.data.id}`);

    return {
      success: true,
      cardId: creation.data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeGenerationError(error),
    };
  }
}
