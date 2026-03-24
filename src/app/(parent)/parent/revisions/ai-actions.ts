"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createStoredRevisionCard } from "@/lib/api/revisions";
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
import {
  PARENT_REVISION_AI_TYPE_OPTIONS,
  PARENT_REVISION_SUBJECT_OPTIONS,
  type ParentRevisionAIType,
} from "@/lib/revisions/parent-drafts";

export interface GenerateRevisionInput {
  subject: string;
  type: ParentRevisionAIType;
  level: string;
  topic: string;
  source: string;
}

export interface GenerateRevisionResult {
  success: boolean;
  error?: string;
  cardId?: string;
  fieldErrors?: Partial<Record<keyof GenerateRevisionInput, string>>;
}

const generateRevisionInputSchema = z.object({
  subject: z.enum(PARENT_REVISION_SUBJECT_OPTIONS),
  type: z.enum(PARENT_REVISION_AI_TYPE_OPTIONS),
  level: z
    .string()
    .max(120, "Level is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length > 0, "Level is required."),
  topic: z
    .string()
    .max(180, "Topic is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Topic must contain at least 2 characters."),
  source: z
    .string()
    .max(30000, "Source content is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 10, "Source content must contain at least 10 characters."),
});

function toFieldErrors(input: z.ZodError): Partial<Record<keyof GenerateRevisionInput, string>> {
  const fieldErrors: Partial<Record<keyof GenerateRevisionInput, string>> = {};
  input.issues.forEach((issue) => {
    const field = issue.path[0];
    if (field === "subject" || field === "type" || field === "level" || field === "topic" || field === "source") {
      fieldErrors[field] = issue.message;
    }
  });
  return fieldErrors;
}

function toFailure(
  error: string,
  fieldErrors?: Partial<Record<keyof GenerateRevisionInput, string>>,
): GenerateRevisionResult {
  return {
    success: false,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
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
    return "Generation failed. The AI output was invalid. Please try again.";
  }

  console.error("[revisions] generation_unexpected_error", {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  return "Generation failed. An unexpected error occurred.";
}

export async function generateRevisionAction(
  input: GenerateRevisionInput,
): Promise<GenerateRevisionResult> {
  const parsed = generateRevisionInputSchema.safeParse(input);
  if (!parsed.success) {
    return toFailure(parsed.error.issues[0]?.message ?? "Invalid form values.", toFieldErrors(parsed.error));
  }

  try {
    let createInput;
    if (parsed.data.type === "procedure") {
      const generated = await generateProcedureCardWithAI({
        subject: parsed.data.subject,
        level: parsed.data.level,
        topic: parsed.data.topic,
        source: parsed.data.source,
      });
      createInput = mapProcedureCardToStoredRevisionDraftInput({
        procedureCard: generated.procedureCard,
        topic: parsed.data.topic,
        structured: generated.structured,
        exercises: generated.exercises,
      });
    } else {
      const generated = await generateConceptCardWithAI({
        subject: parsed.data.subject,
        level: parsed.data.level,
        topic: parsed.data.topic,
        source: parsed.data.source,
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
      return toFailure("Generation failed. Missing card content.");
    }

    createInput = {
      ...createInput,
      content: {
        ...createInputContent,
        source: {
          sourceType: "ai" as const,
        },
      },
    };

    const creation = await createStoredRevisionCard(createInput);
    if (!creation.success || !creation.data) {
      return toFailure(creation.error ?? "Unable to create draft revision card.");
    }

    revalidatePath("/parent/revisions");
    revalidatePath("/parent/revisions/generate");
    revalidatePath(`/parent/revisions/${creation.data.id}`);
    revalidatePath(`/child/revisions/${creation.data.id}`);

    return {
      success: true,
      cardId: creation.data.id,
    };
  } catch (error) {
    return toFailure(toSafeGenerationError(error));
  }
}

export interface GenerateConceptRevisionInput {
  subject: string;
  level: string;
  topic: string;
  source: string;
}

export async function generateConceptRevisionAction(
  input: GenerateConceptRevisionInput,
): Promise<GenerateRevisionResult> {
  return generateRevisionAction({
    ...input,
    type: "concept",
  });
}
