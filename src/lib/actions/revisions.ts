"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteRevisionCard, setRevisionCardStatus } from "@/lib/api/revisions";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { revisionCardStatusSchema } from "@/lib/revisions/validation";

const setRevisionCardStatusActionInputSchema = z.object({
  cardId: z.string().uuid("Identifiant de fiche invalide."),
  status: revisionCardStatusSchema,
});

const deleteRevisionCardActionInputSchema = z.object({
  cardId: z.string().uuid("Identifiant de fiche invalide."),
});

async function canRunParentAction(): Promise<boolean> {
  const context = await getCurrentProfile();
  return Boolean(context.familyId && context.profile?.id && context.role === "parent");
}

export type RevisionCardManagementActionResult =
  | { success: true; data: { cardId: string; status?: z.infer<typeof revisionCardStatusSchema> } }
  | { success: false; error: string };

function buildManagementFailure(error: string): RevisionCardManagementActionResult {
  return { success: false, error };
}

export async function setRevisionCardStatusAction(input: {
  cardId: string;
  status: z.infer<typeof revisionCardStatusSchema>;
}): Promise<RevisionCardManagementActionResult> {
  if (!(await canRunParentAction())) {
    return buildManagementFailure("Action reservee au parent.");
  }

  const parsed = setRevisionCardStatusActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildManagementFailure(parsed.error.issues[0]?.message ?? "Saisie invalide.");
  }

  const result = await setRevisionCardStatus(parsed.data.cardId, parsed.data.status);
  if (!result.success || !result.data) {
    return buildManagementFailure(result.error ?? "Impossible de modifier le statut.");
  }

  revalidatePath("/parent/revisions");
  revalidatePath(`/parent/revisions/${parsed.data.cardId}`);
  revalidatePath(`/child/revisions/${parsed.data.cardId}`);

  return {
    success: true,
    data: {
      cardId: parsed.data.cardId,
      status: result.data.status,
    },
  };
}

export async function deleteRevisionCardAction(input: {
  cardId: string;
}): Promise<RevisionCardManagementActionResult> {
  if (!(await canRunParentAction())) {
    return buildManagementFailure("Action reservee au parent.");
  }

  const parsed = deleteRevisionCardActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildManagementFailure(parsed.error.issues[0]?.message ?? "Saisie invalide.");
  }

  const result = await deleteRevisionCard(parsed.data.cardId);
  if (!result.success || !result.data) {
    return buildManagementFailure(result.error ?? "Impossible de supprimer la fiche.");
  }

  revalidatePath("/parent/revisions");
  revalidatePath(`/parent/revisions/${parsed.data.cardId}`);
  revalidatePath(`/child/revisions/${parsed.data.cardId}`);

  return {
    success: true,
    data: {
      cardId: parsed.data.cardId,
    },
  };
}
