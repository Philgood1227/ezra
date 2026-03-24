"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createStoredRevisionCard } from "@/lib/api/revisions";
import {
  createDefaultRevisionContent,
  type CreateDraftActionResult,
  type CreateDraftInput,
  PARENT_REVISION_SUBJECT_OPTIONS,
  PARENT_REVISION_TYPE_OPTIONS,
} from "@/lib/revisions/parent-drafts";

const createDraftRevisionSchema = z.object({
  subject: z.enum(PARENT_REVISION_SUBJECT_OPTIONS),
  type: z.enum(PARENT_REVISION_TYPE_OPTIONS),
  level: z
    .string()
    .max(120, "Level is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length > 0, "Level is required."),
  title: z
    .string()
    .max(160, "Title is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Title must contain at least 2 characters."),
});

function toFieldErrors(input: z.ZodError): Partial<Record<keyof CreateDraftInput, string>> {
  const fieldErrors: Partial<Record<keyof CreateDraftInput, string>> = {};
  input.issues.forEach((issue) => {
    const field = issue.path[0];
    if (field === "subject" || field === "type" || field === "level" || field === "title") {
      fieldErrors[field] = issue.message;
    }
  });
  return fieldErrors;
}

export async function createDraftRevisionAction(
  input: CreateDraftInput,
): Promise<CreateDraftActionResult> {
  const parsed = createDraftRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form values.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const result = await createStoredRevisionCard({
    title: parsed.data.title,
    subject: parsed.data.subject,
    level: parsed.data.level,
    status: "draft",
    tags: [],
    content: createDefaultRevisionContent(parsed.data.type),
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? "Unable to create draft revision card.",
    };
  }

  revalidatePath("/parent/revisions");
  revalidatePath(`/parent/revisions/${result.data.id}`);

  return {
    success: true,
    cardId: result.data.id,
  };
}
