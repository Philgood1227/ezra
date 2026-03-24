import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import {
  RevisionCardView,
  type MarkReviewedActionState,
} from "@/components/child/revisions";
import { getRevisionCardById, upsertRevisionProgress } from "@/lib/api/revisions";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { generateExtraExercisesForCard } from "@/lib/revisions/generation";
import type { ExercisesPayload } from "@/lib/revisions/types";

interface ChildRevisionCardPageProps {
  params: Promise<{
    cardId: string;
  }>;
}

interface GenerateExtraExercisesActionResult {
  success: boolean;
  error?: string;
  exercises?: ExercisesPayload;
}

const INITIAL_MARK_REVIEWED_STATE: MarkReviewedActionState = {
  success: false,
  message: null,
};

export default async function ChildRevisionCardPage({
  params,
}: ChildRevisionCardPageProps): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id || context.role !== "child") {
    notFound();
  }

  const { cardId } = await params;
  const card = await getRevisionCardById(cardId);
  if (!card) {
    notFound();
  }
  const revisionCard = card;

  async function markReviewedAction(
    _previousState: MarkReviewedActionState,
    formData: FormData,
  ): Promise<MarkReviewedActionState> {
    "use server";

    const submittedCardId = formData.get("cardId");
    if (typeof submittedCardId !== "string" || submittedCardId !== revisionCard.id) {
      return {
        success: false,
        message: "Fiche invalide.",
      };
    }

    const result = await upsertRevisionProgress({
      revisionCardId: submittedCardId,
      completedCount: 1,
      status: "completed",
      lastSeenAt: new Date().toISOString(),
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? "Impossible d'enregistrer la progression.",
      };
    }

    revalidatePath(`/child/revisions/${revisionCard.id}`);

    return {
      success: true,
      message: "Progression enregistree.",
    };
  }

  async function generateExtraExercisesAction(input: {
    cardId: string;
  }): Promise<GenerateExtraExercisesActionResult> {
    "use server";

    if (input.cardId !== revisionCard.id) {
      return {
        success: false,
        error: "Fiche invalide.",
      };
    }

    try {
      const exercises = await generateExtraExercisesForCard(input.cardId);
      return {
        success: true,
        exercises,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[child-revisions] generate_extra_exercises_failed", {
          cardId: input.cardId,
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        success: false,
        error: "Impossible de preparer de nouveaux exercices. Reessaie dans un instant.",
      };
    }
  }

  return (
    <RevisionCardView
      card={revisionCard}
      onMarkReviewedAction={markReviewedAction}
      initialActionState={INITIAL_MARK_REVIEWED_STATE}
      onGenerateExtraExercisesAction={generateExtraExercisesAction}
    />
  );
}
