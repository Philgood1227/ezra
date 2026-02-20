"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { upsertDemoEmotionLog } from "@/lib/demo/wellbeing-store";
import type { ActionResult, EmotionLogInput } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emotionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  moment: z.enum(["matin", "soir"]),
  emotion: z.enum(["tres_content", "content", "neutre", "triste", "tres_triste"]),
  note: z.string().trim().max(160).nullable(),
});

function revalidateEmotionPaths(): void {
  revalidatePath("/child/emotions");
  revalidatePath("/parent/dashboard");
}

export async function upsertEmotionLogAction(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = emotionSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role !== "child") {
    return { success: false, error: "Action reservee a l'enfant." };
  }

  const normalizedInput: EmotionLogInput = {
    date: parsed.data.date,
    moment: parsed.data.moment,
    emotion: parsed.data.emotion,
    note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
  };

  if (!isSupabaseEnabled()) {
    const saved = upsertDemoEmotionLog(context.familyId, context.profile.id, normalizedInput);
    revalidateEmotionPaths();
    return { success: true, data: { id: saved.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("emotion_logs")
    .upsert(
      {
        family_id: context.familyId,
        child_profile_id: context.profile.id,
        date: normalizedInput.date,
        moment: normalizedInput.moment,
        emotion: normalizedInput.emotion,
        note: normalizedInput.note,
      },
      { onConflict: "child_profile_id,date,moment" },
    )
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible d'enregistrer ta meteo interieure." };
  }

  revalidateEmotionPaths();
  return { success: true, data: { id: data.id } };
}
