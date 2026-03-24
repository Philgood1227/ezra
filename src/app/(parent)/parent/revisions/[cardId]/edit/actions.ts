"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateStoredRevisionCard } from "@/lib/api/revisions";
import type { RevisionCardContent } from "@/lib/revisions/types";
import { revisionCardContentSchema } from "@/lib/revisions/validation";

export interface SaveRevisionCardInput {
  id: string;
  title: string;
  content: RevisionCardContent;
}

export interface SaveRevisionCardResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof SaveRevisionCardInput, string>>;
}

const saveRevisionCardInputSchema = z.object({
  id: z.string().uuid("Invalid revision card id."),
  title: z
    .string()
    .max(160, "Title is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Title must contain at least 2 characters."),
  content: z.unknown(),
});

function toFieldErrors(
  input: z.ZodError,
): Partial<Record<keyof SaveRevisionCardInput, string>> {
  const fieldErrors: Partial<Record<keyof SaveRevisionCardInput, string>> = {};

  input.issues.forEach((issue) => {
    const root = issue.path[0];
    if (root === "id" || root === "title" || root === "content") {
      fieldErrors[root] = issue.message;
    }
  });

  return fieldErrors;
}

export async function saveRevisionCardAction(
  input: SaveRevisionCardInput,
): Promise<SaveRevisionCardResult> {
  const parsedBase = saveRevisionCardInputSchema.safeParse(input);
  if (!parsedBase.success) {
    return {
      success: false,
      error: parsedBase.error.issues[0]?.message ?? "Invalid form values.",
      fieldErrors: toFieldErrors(parsedBase.error),
    };
  }

  const parsedContent = revisionCardContentSchema.safeParse(parsedBase.data.content);
  if (!parsedContent.success) {
    return {
      success: false,
      error: parsedContent.error.issues[0]?.message ?? "Invalid revision content.",
      fieldErrors: {
        content: parsedContent.error.issues[0]?.message ?? "Invalid revision content.",
      },
    };
  }

  const result = await updateStoredRevisionCard({
    id: parsedBase.data.id,
    title: parsedBase.data.title,
    content: parsedContent.data,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? "Unable to save revision card.",
    };
  }

  revalidatePath("/parent/revisions");
  revalidatePath(`/parent/revisions/${parsedBase.data.id}`);
  revalidatePath(`/parent/revisions/${parsedBase.data.id}/edit`);
  revalidatePath(`/child/revisions/${parsedBase.data.id}`);

  return {
    success: true,
  };
}
